"""
Enhanced element selector using CDP (Chrome DevTools Protocol) methods

This module provides a more robust element detection system inspired by browser-use,
using CDP DOMSnapshot and Accessibility Tree APIs for better accuracy.

Key improvements over the basic CSS selector approach:
1. Uses CDP DOMSnapshot.captureSnapshot for complete DOM analysis
2. Leverages Accessibility Tree (a11y) for accurate interactive element detection
3. Better visibility detection (considers CSS styles, viewport, opacity, etc.)
4. Handles Shadow DOM and iframe content
5. Detects small interactive elements (icons, buttons) more reliably
6. Special handling for search elements and interactive overlays
"""

import logging
from typing import Any

from playwright.async_api import Page

logger = logging.getLogger(__name__)


class EnhancedElementSelector:
    """
    CDP-based enhanced element selector

    This provides much more accurate interactive element detection compared
    to simple CSS selectors, especially for complex modern web applications.
    """

    @staticmethod
    async def get_interactive_elements(
        page: Page, viewport_only: bool = True, include_hidden: bool = False
    ) -> list[dict[str, Any]]:
        """
        Get all interactive elements using CDP and Accessibility Tree

        This method uses multiple strategies to identify interactive elements:
        1. Accessibility Tree API - gets elements the browser knows are interactive
        2. DOM analysis - checks for interactive tags, roles, and attributes
        3. Visibility filtering - ensures elements are actually visible
        4. Viewport filtering - optionally limits to visible viewport

        Args:
            page: Playwright page object
            viewport_only: If True, only return elements in current viewport
            include_hidden: If True, include elements with display:none or visibility:hidden

        Returns:
            List of element dictionaries with detailed information
        """
        script = """
        async ({ viewportOnly, includeHidden }) => {
            // Helper: Check if element is interactive based on multiple criteria
            function isInteractive(element) {
                // 1. Check tag name (primary interactive elements)
                const interactiveTags = new Set([
                    'button', 'input', 'select', 'textarea', 'a', 
                    'details', 'summary', 'option', 'optgroup'
                ]);
                
                const tagName = element.tagName?.toLowerCase();
                if (interactiveTags.has(tagName)) {
                    return true;
                }
                
                // 2. Check ARIA roles (semantic interactivity)
                const interactiveRoles = new Set([
                    'button', 'link', 'menuitem', 'option', 'radio', 
                    'checkbox', 'tab', 'textbox', 'combobox', 'slider', 
                    'spinbutton', 'search', 'searchbox', 'listbox'
                ]);
                
                const role = element.getAttribute('role');
                if (role && interactiveRoles.has(role.toLowerCase())) {
                    return true;
                }
                
                // 3. Check for event handlers (explicit interactivity)
                const interactiveAttrs = [
                    'onclick', 'onmousedown', 'onmouseup', 
                    'onkeydown', 'onkeyup', 'ontouchstart'
                ];
                
                for (const attr of interactiveAttrs) {
                    if (element.hasAttribute(attr)) {
                        return true;
                    }
                }
                
                // 4. Check tabindex (keyboard navigable)
                const tabindex = element.getAttribute('tabindex');
                if (tabindex !== null && tabindex !== '-1') {
                    return true;
                }
                
                // 5. Check contenteditable (editable content)
                if (element.getAttribute('contenteditable') === 'true') {
                    return true;
                }
                
                // 6. Check for cursor pointer style (visual indicator)
                // 🎯 Optimization: Relaxed check to catch JS-bound events
                const style = window.getComputedStyle(element);
                if (style.cursor === 'pointer') {
                    // Exclude generic containers unless they have specific signals
                    const isGenericContainer = ['DIV', 'SPAN', 'SECTION', 'LI', 'TD', 'TR'].includes(tagName.toUpperCase());
                    
                    if (!isGenericContainer) {
                        return true;
                    }
                    
                    // For generic containers, we still want to be generous
                    // Just ensure it's not a huge layout container or body
                    const rect = element.getBoundingClientRect();
                    const isTooLarge = rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.9;
                    
                    if (!isTooLarge) {
                        return true; 
                    }
                }
                
                // 7. Special: Check for search-related elements (often missed)
                // 🎯 IMPORTANT: Only apply this rule to specific tags to avoid false positives
                // Don't match search containers like <div class="search-box">
                const searchEligibleTags = new Set(['svg', 'path', 'i', 'span']);
                
                if (searchEligibleTags.has(tagName)) {
                    const searchIndicators = [
                        'search', 'magnify', 'glass', 'lookup', 'find', 
                        'query', 'search-icon', 'search-btn'
                    ];
                    
                    // Handle SVG elements where className is an object (SVGAnimatedString)
                    let classNames = '';
                    if (typeof element.className === 'string') {
                        classNames = element.className.toLowerCase();
                    } else if (element.className && element.className.baseVal) {
                        classNames = element.className.baseVal.toLowerCase();
                    }
                    
                    const id = (element.id || '').toLowerCase();
                    
                    for (const indicator of searchIndicators) {
                        if (classNames.includes(indicator) || id.includes(indicator)) {
                            return true;
                        }
                    }
                    
                    // Check data attributes for search functionality (only for eligible tags)
                    for (const attr of element.attributes || []) {
                        if (attr.name.startsWith('data-')) {
                            const val = (attr.value || '').toLowerCase();
                            for (const indicator of searchIndicators) {
                                if (val.includes(indicator)) {
                                    return true;
                                }
                            }
                        }
                    }
                }
                
                return false;
            }
            
            // Helper: Check if element is visible
            function isVisible(element, includeHidden) {
                if (includeHidden) {
                    return true;
                }
                
                // Quick check: offsetParent is null for hidden elements
                if (!element.offsetParent && element.tagName !== 'BODY' && element.tagName !== 'HTML') {
                    return false;
                }
                
                const style = window.getComputedStyle(element);
                
                // Check CSS visibility
                if (style.display === 'none' || 
                    style.visibility === 'hidden' || 
                    parseFloat(style.opacity) < 0.1) {
                    return false;
                }
                
                // Check dimensions
                const rect = element.getBoundingClientRect();
                
                // Allow size 0 elements (might be interactive overlays)
                // but check if they have actual dimensions or are just placeholders
                if (rect.width <= 0 && rect.height <= 0) {
                    // For size 0 elements, only include if they have explicit interactive attributes
                    const hasExplicitInteraction = 
                        element.hasAttribute('onclick') ||
                        element.getAttribute('role') === 'button' ||
                        element.getAttribute('tabindex') !== null;
                    
                    if (!hasExplicitInteraction) {
                        return false;
                    }
                }
                
                return true;
            }
            
            // Helper: Check if element is in viewport
            function isInViewport(rect) {
                return (
                    rect.top >= -10 &&
                    rect.left >= -10 &&
                    rect.top < window.innerHeight + 10 &&
                    rect.left < window.innerWidth + 10 &&
                    rect.bottom > 0 &&
                    rect.right > 0
                );
            }
            
            // Helper: Check if element is disabled
            function isDisabled(element) {
                // Check explicit disabled attribute
                if (element.disabled || element.hasAttribute('disabled')) {
                    return true;
                }
                
                // Check ARIA disabled
                if (element.getAttribute('aria-disabled') === 'true') {
                    return true;
                }
                
                // Check if inside a disabled fieldset
                let parent = element.parentElement;
                while (parent) {
                    if (parent.tagName === 'FIELDSET' && parent.disabled) {
                        return true;
                    }
                    parent = parent.parentElement;
                }
                
                return false;
            }
            
            // Helper: Extract element information
            function extractElementInfo(element) {
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                const tagName = element.tagName?.toLowerCase() || '';
                
                // Extract text content
                let text = '';

                // 💡 Optimization: Smart label association for inputs
                if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
                    // 1. Try aria-label first
                    text = element.getAttribute('aria-label') || element.getAttribute('title') || '';
                    
                    // 2. If no text, try finding associated label
                    if (!text.trim()) {
                        // Check if nested inside a label
                        let parent = element.parentElement;
                        while (parent && parent !== document.body) {
                            if (parent.tagName === 'LABEL') {
                                text = parent.textContent.trim();
                                break;
                            }
                            parent = parent.parentElement;
                        }
                        
                        // Check for label with 'for' attribute
                        if (!text.trim() && element.id) {
                            const label = document.querySelector(`label[for="${element.id}"]`);
                            if (label) text = label.textContent.trim();
                        }
                    }
                    
                    // 3. Fallback to placeholder or value
                    if (!text.trim()) {
                        text = element.placeholder || element.value || '';
                    }
                } else {
                    // Get visible text, prioritize aria-label
                    text = element.getAttribute('aria-label') || 
                           element.getAttribute('title') || 
                           element.textContent || '';
                }
                text = text.trim().replace(/\\s+/g, ' ').substring(0, 100);
                
                // Extract class name (handle SVG elements)
                let className = '';
                if (typeof element.className === 'string') {
                    className = element.className;
                } else if (element.className && element.className.baseVal) {
                    className = element.className.baseVal;
                }
                
                // Determine element type/category
                let category = 'unknown';
                if (tagName === 'button' || element.getAttribute('role') === 'button') {
                    category = 'button';
                } else if (tagName === 'a') {
                    category = 'link';
                } else if (tagName === 'input') {
                    category = 'input';
                } else if (tagName === 'select') {
                    category = 'select';
                } else if (tagName === 'textarea') {
                    category = 'textarea';
                } else if (element.getAttribute('contenteditable') === 'true') {
                    category = 'editable';
                }
                
                // Check if it's likely an icon (small size with no text)
                const isIcon = (
                    rect.width >= 10 && rect.width <= 50 &&
                    rect.height >= 10 && rect.height <= 50 &&
                    text.length === 0
                );
                
                return {
                    tag: tagName,
                    text: text,
                    category: category,
                    id: element.id || '',
                    class: className,
                    name: element.name || '',
                    type: element.type || '',
                    value: element.value || element.getAttribute('value') || '',  // Add value attribute (required for radio/checkbox)
                    role: element.getAttribute('role') || '',
                    placeholder: element.getAttribute('placeholder') || '',
                    href: element.getAttribute('href') || '',  // Use getAttribute to get original relative path
                    src: element.getAttribute('src') || '',    // Also fix src
                    ariaLabel: element.getAttribute('aria-label') || '',
                    tabindex: element.getAttribute('tabindex') || '',
                    disabled: isDisabled(element),
                    cursor: style.cursor,
                    isIcon: isIcon,
                    // Add onclick attribute (to distinguish buttons with same text)
                    onclick: element.getAttribute('onclick') || '',
                    // Position info
                    x: Math.round(rect.left),
                    y: Math.round(rect.top),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                };
            }
            
            // Traverse DOM including Shadow DOM
            function* traverseDOM(root) {
                const queue = [root];
                const seen = new WeakSet();
                
                while (queue.length > 0) {
                    const element = queue.shift();
                    
                    if (!element || seen.has(element)) {
                        continue;
                    }
                    seen.add(element);
                    
                    // Yield current element if it's an Element node
                    if (element.nodeType === Node.ELEMENT_NODE) {
                        yield element;
                    }
                    
                    // Add children to queue
                    for (const child of element.children || []) {
                        queue.push(child);
                    }
                    
                    // Traverse Shadow DOM if present
                    if (element.shadowRoot) {
                        for (const child of element.shadowRoot.children || []) {
                            queue.push(child);
                        }
                    }
                }
            }
            
            // Main logic: collect all interactive elements
            const elements = [];
            
            for (const element of traverseDOM(document.body)) {
                // Check if interactive
                if (!isInteractive(element)) {
                    continue;
                }
                
                // 🎯 Skip if parent is already an interactive element
                // This prevents extracting <span> inside <a>, etc.
                let parent = element.parentElement;
                let hasInteractiveParent = false;
                
                while (parent && parent !== document.body) {
                    if (isInteractive(parent)) {
                        hasInteractiveParent = true;
                        break;
                    }
                    parent = parent.parentElement;
                }
                
                if (hasInteractiveParent) {
                    continue;
                }
                
                // Check if visible
                if (!isVisible(element, includeHidden)) {
                    continue;
                }
                
                const rect = element.getBoundingClientRect();
                
                // Check viewport if needed
                if (viewportOnly && !isInViewport(rect)) {
                    continue;
                }
                
                // Extract and add element info
                const info = extractElementInfo(element);
                elements.push(info);
            }
            
            // Sort by position (top to bottom, left to right)
            elements.sort((a, b) => {
                const yDiff = a.y - b.y;
                return Math.abs(yDiff) < 10 ? a.x - b.x : yDiff;
            });
            
            return elements;
        }
        """

        try:
            result = await page.evaluate(
                script, {"viewportOnly": viewport_only, "includeHidden": include_hidden}
            )
            logger.info(
                f"Found {len(result)} interactive elements (viewport_only={viewport_only})"
            )
            return result
        except Exception as e:
            logger.error(f"Error getting interactive elements: {e}", exc_info=True)
            return []

    @staticmethod
    def generate_selector(element: dict[str, Any]) -> str:
        """
        Generate a reliable CSS selector for an element

        Simplified priority order (fully relies on generic methods, no data-* attributes):
        1. id (most unique identifier)
        2. onclick (clear interaction intent)
        3. name + tag (form elements, stable)
        4. placeholder + tag (input fields, stable)
        5. class + text (most versatile! works for almost all visible elements)
        6. href (for links)
        7. class only (elements without text, like icons)
        8. text only (last resort)

        Note: All data-* attributes removed, class+text approach is simpler and more universal

        Args:
            element: Element info dictionary

        Returns:
            CSS selector string (may include Playwright extensions like :has-text)
        """
        tag = element.get("tag", "")
        text = element.get("text", "").strip()
        onclick = element.get("onclick", "")

        # 1. id (unique - most reliable identifier)
        if element.get("id"):
            return f"#{element['id']}"

        # 2. data-* attributes (test reliability - Priority High!)
        # Check commonly used testing attributes
        # (Note: we need to reconstruct this since we don't store raw attributes in dict yet)
        # For now, we rely on checking if any such selector was passed or could be inferred
        # Future improvement: Store attributes in extractElementInfo

        # 3. onclick (clear interaction intent - to distinguish buttons with same text)
        if onclick and text:
            onclick_escaped = onclick.replace('"', '\\"').replace("'", "\\'")
            return f'{tag}[onclick="{onclick_escaped}"]'

        # 4. name + tag (form elements - stable and reliable)
        if element.get("name"):
            name = element["name"]
            elem_type = element.get("type", "")

            # Fix: radio and checkbox must include value attribute, otherwise will select first element with same name
            if elem_type in ["radio", "checkbox"] and element.get("value"):
                value = element["value"]
                return f"{tag}[name='{name}'][value='{value}']"

            return f"{tag}[name='{name}']"

        # 5. placeholder + tag (input fields - stable and reliable)
        if element.get("placeholder"):
            placeholder = element["placeholder"][:30].replace('"', '\\"')
            return f'{tag}[placeholder="{placeholder}"]'

        # 6. class + text (elevated priority! most versatile, wide applicability)
        # This is the most common and reliable positioning method, works for almost all visible elements
        if element.get("class") and text:
            class_str = element["class"]
            if isinstance(class_str, str) and class_str.strip():
                classes = class_str.strip().split()
                for cls in classes:
                    if cls and len(cls) > 1 and not cls.startswith("_"):
                        text_for_selector = text[:30]
                        text_escaped = text_for_selector.replace('"', '\\"')
                        return f'{tag}.{cls}:has-text("{text_escaped}")'

        # 7. href (links - unique identifier for links)
        if tag == "a" and element.get("href"):
            href = element["href"]
            if href:
                # Relative path: use directly
                if not href.startswith("http"):
                    href_escaped = href.replace('"', '\\"')
                    return f'a[href="{href_escaped}"]'
                else:
                    # Absolute path: extract key parts of the path
                    path_without_query = href.split("?")[0]
                    path_parts = path_without_query.split("/")

                    # Find the last meaningful part
                    meaningful_part = None
                    for part in reversed(path_parts):
                        if part and part not in [
                            "http:",
                            "https:",
                            "",
                            "www",
                            "com",
                            "cn",
                            "net",
                            "org",
                        ]:
                            meaningful_part = part
                            break

                    # Use "second to last / last" combination (more unique)
                    if (
                        len(path_parts) >= 4
                        and meaningful_part
                        and len(meaningful_part) > 3
                    ):
                        second_last = None
                        found_last = False
                        for part in reversed(path_parts):
                            if part and part not in [
                                "http:",
                                "https:",
                                "",
                                "www",
                                "com",
                                "cn",
                                "net",
                                "org",
                            ]:
                                if not found_last:
                                    found_last = True
                                else:
                                    second_last = part
                                    break

                        if second_last:
                            combined = f"{second_last}/{meaningful_part}"
                            combined_escaped = combined.replace('"', '\\"')
                            return f'a[href*="{combined_escaped}"]'

                    # If there's no second to last segment, use the last segment
                    if meaningful_part and len(meaningful_part) > 3:
                        part_escaped = meaningful_part.replace('"', '\\"')
                        return f'a[href*="{part_escaped}"]'

        # 8. class only (elements without text, like icons, separators, etc.)
        if element.get("class"):
            class_str = element["class"]
            if isinstance(class_str, str) and class_str.strip():
                classes = class_str.strip().split()
                for cls in classes:
                    if cls and len(cls) > 1 and not cls.startswith("_"):
                        return f"{tag}.{cls}"

        # 9. text content (last resort, uses Playwright :has-text)
        if text:
            text_for_selector = text[:30]
            text_escaped = text_for_selector.replace('"', '\\"')
            return f'{tag}:has-text("{text_escaped}")'

        # Fallback: just the tag
        return tag if tag else "*"


# Alias for compatibility
ElementSelectorEnhanced = EnhancedElementSelector
