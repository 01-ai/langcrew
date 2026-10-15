"""
CSS selector-based element selection

This module provides a simple, efficient element selection system using CSS selectors only.
"""

import logging

from playwright.async_api import ElementHandle, Page

logger = logging.getLogger(__name__)


class ElementNotFoundError(Exception):
    """Raised when an element cannot be found"""

    def __init__(self, message: str, selector: str):
        self.selector = selector
        super().__init__(message)


class CSSElementSelector:
    """
    CSS selector-based element location

    This class provides a clean interface for element selection using CSS selectors.
    CSS selectors are the industry standard for web automation, covering 99% of use cases.

    Common CSS selector patterns:
        - ID:           "#submit-button"
        - Class:        ".btn-primary"
        - Tag:          "button"
        - Attribute:    "[data-testid='login']"
        - Combined:     "button.btn-primary[type='submit']"
        - Hierarchy:    "form > button.submit"
        - Nth-child:    "button:nth-child(2)"
    """

    @staticmethod
    async def find_element(
        page: Page,
        css_selector: str,
        timeout: int = 5000,
        state: str = "attached",
        prefer_visible: bool = True,
    ) -> ElementHandle:
        """
        Find element by CSS selector

        Args:
            page: Playwright page object
            css_selector: CSS selector string
            timeout: Timeout in milliseconds
            state: Element state to wait for ('attached', 'visible', 'hidden')
                   Default is 'attached' which is more lenient than 'visible'
            prefer_visible: If True and multiple elements match, prefer the first visible one

        Returns:
            Playwright ElementHandle

        Raises:
            ElementNotFoundError: If element cannot be found
        """
        try:
            # Smart element selection when multiple elements match
            if prefer_visible and state == "attached":
                # Get all matching elements
                all_matches = await page.query_selector_all(css_selector)
                if len(all_matches) > 1:
                    logger.debug(
                        f"Found {len(all_matches)} elements matching '{css_selector}', selecting first visible one"
                    )
                    # Try to find the first visible element
                    for elem in all_matches:
                        try:
                            is_visible = await elem.is_visible()
                            if is_visible:
                                logger.debug(
                                    f"Selected visible element: {css_selector}"
                                )
                                return elem
                        except Exception:
                            continue
                    # If no visible element, return first attached one
                    logger.warning(
                        f"No visible element found among {len(all_matches)} matches, using first: {css_selector}"
                    )
                    if all_matches:
                        return all_matches[0]

            # Standard wait_for_selector for single element or visible state
            element = await page.wait_for_selector(
                css_selector, timeout=timeout, state=state
            )
            if element is None:
                raise ElementNotFoundError(
                    f"Element not found with CSS selector: {css_selector}",
                    css_selector,
                )
            logger.debug(f"Found element by CSS selector: {css_selector}")
            return element
        except Exception as e:
            if isinstance(e, ElementNotFoundError):
                raise

            # Provide more helpful error message for common issues
            error_msg = f"Error finding element with CSS selector '{css_selector}': {e}"

            # Try to get more info about what went wrong
            try:
                # Check if element exists at all (without visibility check)
                all_matches = await page.query_selector_all(css_selector)
                if len(all_matches) > 1:
                    error_msg += f"\nNote: Found {len(all_matches)} elements matching this selector. "
                    error_msg += "Consider using a more specific selector or use :first-child, :nth-child() etc."
                elif len(all_matches) == 1:
                    error_msg += "\nNote: Element exists in DOM but failed state check. It might be hidden or not yet visible."
            except Exception:
                pass  # Ignore errors in diagnostic check

            raise ElementNotFoundError(error_msg, css_selector) from e

    @staticmethod
    async def find_elements(page: Page, css_selector: str) -> list[ElementHandle]:
        """
        Find all elements matching CSS selector

        Args:
            page: Playwright page object
            css_selector: CSS selector string

        Returns:
            List of Playwright ElementHandle objects
        """
        try:
            elements = await page.query_selector_all(css_selector)
            logger.debug(
                f"Found {len(elements)} elements with CSS selector: {css_selector}"
            )
            return elements
        except Exception as e:
            logger.error(
                f"Error finding elements with CSS selector '{css_selector}': {e}"
            )
            return []

    @staticmethod
    async def get_interactive_elements(
        page: Page, viewport_only: bool = True
    ) -> list[dict]:
        """
        Get all interactive elements on the page

        This is useful for AI agents to understand what elements are available.

        Args:
            page: Playwright page object
            viewport_only: If True, only return elements visible in the current viewport (recommended)
                        If False, return all visible elements on the page

        Returns:
            List of dictionaries with element info (tag, text, id, class, selector, etc.)
        """
        script = """
        (viewportOnly) => {
            // Select interactive elements, excluding disabled ones
            const selectors = [
                'a[href]',
                'button:not([disabled])',
                'input:not([disabled]):not([type="hidden"])',
                'select:not([disabled])',
                'textarea:not([disabled])',
                '[role="button"]:not([aria-disabled="true"])',
                '[role="link"]',
                '[role="checkbox"]:not([aria-disabled="true"])',
                '[role="radio"]:not([aria-disabled="true"])',
                '[tabindex]:not([tabindex="-1"])',
                '[onclick]'
            ];
            
            const elements = Array.from(document.querySelectorAll(selectors.join(', ')));

            // First pass: filter and cache bounding boxes
            const filtered = elements
                .map(el => {
                    // 1. Basic visibility check
                    // Fast check: offsetParent is null for hidden elements (except body/html)
                    if (!el.offsetParent && el.tagName !== 'BODY') {
                        return null;
                    }
                    
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || 
                        style.visibility === 'hidden' || 
                        parseFloat(style.opacity) < 0.1) {
                        return null;
                    }
                    
                    const rect = el.getBoundingClientRect();
                    
                    // Must have dimensions
                    if (rect.width <= 0 || rect.height <= 0) {
                        return null;
                    }
                    
                    // 2. Viewport check (if enabled)
                    if (viewportOnly) {
                        // Element must be within viewport bounds (with small margin for edge cases)
                        const inViewport = (
                            rect.top >= -10 &&
                            rect.left >= -10 &&
                            rect.top < window.innerHeight + 10 &&
                            rect.left < window.innerWidth + 10
                        );
                        if (!inViewport) {
                            return null;
                        }
                    }
                    
                    // Cache the element and its rect for later use
                    return { el, rect };
                })
                .filter(item => item !== null);

            // Sort by position (top to bottom, left to right - reading order)
            filtered.sort((a, b) => {
                const yDiff = a.rect.top - b.rect.top;
                // If Y difference is small (< 10px), sort by X
                return Math.abs(yDiff) < 10 ? a.rect.left - b.rect.left : yDiff;
            });

            // Extract element information
            return filtered.map(({ el, rect }) => {
                // Safe text extraction with whitespace cleanup
                let text = '';
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    text = el.value || el.placeholder || '';
                } else {
                    text = el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '';
                }
                text = text.trim().replace(/\s+/g, ' ').substring(0, 100);
                
                // Safe className extraction (handle SVG elements that have className as object)
                let className = '';
                if (typeof el.className === 'string') {
                    className = el.className;
                } else if (el.className && el.className.baseVal) {
                    className = el.className.baseVal; // SVG elements
                }
                
                return {
                    tag: el.tagName.toLowerCase(),
                    text: text,
                    id: el.id || '',
                    class: className,
                    name: el.name || '',
                    type: el.type || '',
                    value: el.value || el.getAttribute('value') || '',  // Add value attribute (required for radio/checkbox)
                    role: el.getAttribute('role') || '',
                    placeholder: el.getAttribute('placeholder') || '',
                    href: el.href || '',
                    src: el.src || '',
                    // Keep position for reference (can be removed in middleware if needed)
                    y: Math.round(rect.top),
                    x: Math.round(rect.left)
                };
            });
        }
        """

        return await page.evaluate(script, viewport_only)

    def _generate_selector(element: dict) -> str:
        """
        Generate CSS selector (complete version)

        Supports Playwright extended selectors:
        - :has-text("text") - Text matching
        - :nth-match(n) - Nth match
        """
        tag = element.get("tag", "")
        text = element.get("text", "").strip()

        # 1. data-testid (highest priority)
        if element.get("dataTestId"):
            return f"[data-testid='{element['dataTestId']}']"

        # 2. id
        if element.get("id"):
            return f"#{element['id']}"

        # 3. name + tag
        if element.get("name"):
            return f"{tag}[name='{element['name']}']"

        # 4. placeholder + tag
        if element.get("placeholder"):
            placeholder = element["placeholder"][:30].replace('"', '\\"')
            return f'{tag}[placeholder="{placeholder}"]'

        # 5. class + tag
        if element.get("class"):
            classes = [c for c in element["class"].split() if c and len(c) > 1]
            if classes:
                return f"{tag}.{classes[0]}"

        # 6. href (for links)
        if tag == "a" and element.get("href"):
            href = element["href"].replace('"', '\\"')
            return f'a[href="{href}"]'

        # 7. text (last resort)
        if text:
            text_for_selector = text[:30]
            text_escaped = text_for_selector.replace('"', '\\"')
            return f'{tag}:has-text("{text_escaped}")'

        # Fallback
        return tag


# Export the class as default for convenience
ElementSelector = CSSElementSelector
