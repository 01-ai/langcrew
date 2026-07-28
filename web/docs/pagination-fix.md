# Ant Design Pagination Ellipsis

Ant Design pagination can display its ellipsis vertically or misalign it when global typography or flex rules override the component styles.

## Recommended Fix

Keep the pagination container on one line and normalize the ellipsis box:

```css
.ant-pagination {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}

.ant-pagination .ant-pagination-item-ellipsis {
  display: inline-block;
  line-height: 1;
  text-align: center;
  vertical-align: middle;
}
```

Apply the narrowest selector that fixes the host application. Avoid global font overrides and `!important` unless the application stylesheet has a confirmed specificity conflict.

## Verification

Check pagination at the beginning, middle, and end of a long result set. Verify the ellipsis remains horizontal, page buttons stay aligned, keyboard focus is visible, and the layout works at narrow widths.

This document describes a styling issue rather than a reusable AgentX API. The consuming application owns the final selector and stylesheet location.
