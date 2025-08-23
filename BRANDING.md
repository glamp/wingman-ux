# Wingman Brand Guidelines

## Color Palette 🎨

### Primary Colors
- **Primary Blue**: `#0084ff` - Main brand color, used for primary actions and accents
- **Primary Hover**: `#0073e6` - Darker shade for hover states
- **Purple Accent**: `#8b5cf6` - Secondary accent for gradients and special elements

### Gradients
- **Primary Gradient**: `linear-gradient(135deg, #0084ff, #8b5cf6)`
  - Used for buttons, headings, and key UI elements
  - Creates a vibrant blue-to-purple transition

### Background Colors
- **Background Primary**: `#ffffff` - Main background
- **Background Secondary**: `#f8fafc` - Subtle gray for sections
- **Background Glass**: `rgba(255, 255, 255, 0.8)` - Glassmorphism effect

### Text Colors
- **Text Primary**: `#1e293b` - Main text color
- **Text Secondary**: `#64748b` - Secondary/muted text
- **Text Muted**: `#94a3b8` - Disabled or very subtle text

### UI Colors
- **Border Color**: `#e2e8f0` - Subtle borders
- **Success Color**: `#10b981` - Success states
- **Error Color**: `#ef4444` - Error states  
- **Warning Color**: `#f59e0b` - Warning states

## Visual Effects

### Background Patterns
Radial gradients for subtle depth:
```css
radial-gradient(circle at 25% 25%, rgba(0, 132, 255, 0.1) 0%, transparent 50%),
radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
```

### Shadows
- **Small**: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- **Medium**: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`
- **Large**: `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`
- **Primary Glow**: `0 8px 25px rgba(0, 132, 255, 0.4)` - For hovering primary buttons

### Border Radius
- **Small**: `6px`
- **Medium**: `8px`
- **Large**: `12px`
- **Extra Large**: `16px`
- **Pill**: `100px` - For buttons and badges

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Monospace
```css
font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
```

## Component Styles

### Buttons
- **Primary**: Gradient background with white text
- **Secondary**: White background with primary text color
- **Hover**: Slight scale (1.02) and lift effect (-2px translateY)
- **Transition**: `all 0.3s ease`

### Cards
- **Background**: White with 80% opacity
- **Backdrop Filter**: `blur(10px)` for glassmorphism
- **Border**: 1px solid with border-color

### Interactive Elements
- **Focus Outline**: 2px solid primary color
- **Hover Animations**: Scale and shadow transformations
- **Transitions**: 0.3s ease for smooth interactions

## Usage Examples

### Chrome Extension Popup
The Chrome extension uses the primary gradient for action buttons and maintains a clean white/light gray aesthetic with blue accents.

### Tunnel Server Landing Page
The tunnel server landing page showcases the full brand palette with gradient headings, glassmorphic cards, and animated visual effects.

### Preview UI
The preview UI maintains consistency with the brand colors while adapting to different annotation states and user interactions.

## Implementation

All brand colors are defined as CSS custom properties (CSS variables) for easy maintenance:

```css
:root {
  --primary-color: #0084ff;
  --primary-hover: #0073e6;
  --purple-accent: #8b5cf6;
  --success-color: #10b981;
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
}
```

This ensures consistency across all Wingman components and makes theme updates straightforward.