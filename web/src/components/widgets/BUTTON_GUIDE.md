# Button Component Guide

完善的Button组件支持多种颜色、变体、大小和图标配置。

## 基础用法

```tsx
import { Button } from '@/components/widgets/Button';

// 简单按钮
<Button label="Submit" />

// 带颜色的按钮
<Button label="Success" color="success" />

// 带图标的按钮
<Button 
  label="Download" 
  iconStart="download"
  iconEnd="arrow-right"
/>
```

## 颜色选项

支持以下8种颜色：
- `primary` - 主色（默认）
- `secondary` - 次色
- `info` - 信息蓝色
- `success` - 成功绿色
- `warning` - 警告橙色
- `caution` - 注意黄色
- `danger` - 危险红色
- `discovery` - 发现紫色

```tsx
<Button color="primary" label="Primary" />
<Button color="success" label="Success" />
<Button color="warning" label="Warning" />
<Button color="danger" label="Danger" />
```

## 变体选项

支持4种视觉变体：

### Solid（实心）
```tsx
<Button variant="solid" label="Solid Button" />
```

### Soft（柔和）
```tsx
<Button variant="soft" label="Soft Button" />
```

### Outline（边框）
```tsx
<Button variant="outline" label="Outline Button" />
```

### Ghost（幽灵）
```tsx
<Button variant="ghost" label="Ghost Button" />
```

## 大小选项

支持9种大小：`3xs`, `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`

```tsx
<Button size="sm" label="Small" />
<Button size="md" label="Medium" />
<Button size="lg" label="Large" />
<Button size="2xl" label="Extra Large" />
```

## 图标大小

支持5种图标大小：`sm`, `md`, `lg`, `xl`, `2xl`

```tsx
<Button 
  iconStart="plus" 
  iconSize="lg"
  label="Add Item"
/>
```

## 图标支持

按钮支持以下图标：
- agent, analytics, atom, batch, bolt, book-open, book-closed, book-clock
- bug, calendar, chart, check, check-circle, check-circle-filled
- chevron-left, chevron-right, circle-question, compass, confetti
- cube, desktop, document, dot, dots-horizontal, dots-vertical
- empty-circle, external-link, globe, keys, lab, images, info
- lifesaver, lightbulb, mail, map-pin, maps, mobile, name
- notebook, notebook-pencil, page-blank, phone, play, plus, profile
- profile-card, reload, star, star-filled, search, sparkle, sparkle-double
- square-code, square-image, square-text, suitcase, settings-slider
- user, wreath, write, write-alt, write-alt2

```tsx
<Button iconStart="agent" label="Agents" />
<Button iconStart="check" iconEnd="arrow-right" label="Confirm" />
```

## 按钮形状

### Pill（药丸形）
```tsx
<Button pill={true} label="Pill Button" />    // 完全圆角（默认）
<Button pill={false} label="Square Button" /> // 直角或小圆角
```

### Uniform（正方形）
```tsx
<Button 
  uniform={true} 
  iconStart="plus"
  size="lg"
/>
```

## 样式快捷方式

使用`style`属性快速应用预设样式：

```tsx
<Button style="primary" label="Primary Style" />    // solid variant
<Button style="secondary" label="Secondary Style" /> // outline variant
```

## 块级按钮

```tsx
<Button block={true} label="Full Width Button" />
```

## 禁用状态

### 显式禁用
```tsx
<Button disabled label="Disabled Button" />
```

### 自动禁用
如果没有传入 `onClickAction` 且按钮不是提交按钮，按钮会自动禁用：

```tsx
// 这个按钮会自动禁用（没有onClickAction）
<Button label="This button is auto-disabled" />

// 这个按钮不会禁用（提交按钮不需要onClickAction）
<Button submit={true} label="Submit" />

// 这个按钮不会禁用（有onClickAction）
<Button 
  label="This button is enabled"
  onClickAction={{ type: 'action' }}
/>
```

## 提交按钮

```tsx
<Button submit={true} label="Submit Form" />
```

## 点击事件

```tsx
<Button 
  label="Click Me"
  onClick={(e) => console.log('Clicked!')}
  onClickAction={{ 
    type: 'custom_action', 
    payload: { action: 'save' } 
  }}
/>
```

## 完整示例

```tsx
<Card>
  {/* 颜色示例 */}
  <Button label="Primary" color="primary" />
  <Button label="Success" color="success" />
  <Button label="Warning" color="warning" />
  <Button label="Danger" color="danger" />

  {/* 变体示例 */}
  <Button label="Solid" variant="solid" />
  <Button label="Soft" variant="soft" />
  <Button label="Outline" variant="outline" />
  <Button label="Ghost" variant="ghost" />

  {/* 大小示例 */}
  <Button size="sm" label="Small" />
  <Button size="lg" label="Large" />

  {/* 图标示例 */}
  <Button iconStart="plus" label="Add" />
  <Button iconStart="check" iconEnd="arrow-right" label="Confirm" />

  {/* 形状示例 */}
  <Button pill={true} label="Pill" />
  <Button uniform={true} iconStart="plus" />
</Card>
```

## JSON 结构

在JSON配置中使用Button：

```json
{
  "type": "Button",
  "label": "Click Me",
  "color": "success",
  "variant": "solid",
  "size": "lg",
  "pill": true,
  "iconStart": "check",
  "onClickAction": {
    "type": "custom_action",
    "payload": { "action": "save" }
  }
}
```

## CSS 类和属性

Button组件使用以下CSS类和data属性进行样式化：

- `.w-button` - 基础按钮类
- `.w-button-inner` - 内部内容包装
- `.w-button-icon` - 图标基类
- `.w-button-icon-start` - 开始图标
- `.w-button-icon-end` - 结束图标
- `[data-w-component="button"]` - 按钮标识符
- `[data-color]` - 颜色属性
- `[data-variant]` - 变体属性
- `[data-size]` - 大小属性
- `[data-pill]` - 药丸形状标识符
- `[data-uniform]` - 正方形形状标识符
- `[data-block]` - 块级标识符
- `[data-icon-size]` - 图标大小属性
- `[aria-disabled]` - 禁用状态标识符

## 响应式和交互

- 悬停状态 - 自动改变背景和边框颜色
- 活跃状态 - 按下时的视觉反馈
- 禁用状态 - 降低透明度，禁用交互
- 焦点状态 - 支持键盘导航

