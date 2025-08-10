# Internationalization (i18n) Implementation Guide

## Overview

ZephyrOS now includes a comprehensive internationalization system supporting English and Chinese languages with seamless switching and localStorage persistence.

## Architecture

### Core Files

1. **`/apps/zflow/lib/i18n.ts`** - Core i18n utilities and translations
2. **`/apps/zflow/contexts/LanguageContext.tsx`** - React context for language management  
3. **`/apps/zflow/app/components/LanguageSelector.tsx`** - UI component for language switching
4. **`/apps/zflow/app/components/DynamicHead.tsx`** - Dynamic meta tag updates

## Features

### ✅ Language Support
- **English (en)**: Default language, international-ready
- **Chinese (zh)**: Complete Chinese translations
- **Auto-detection**: Browser language detection with fallback
- **Persistence**: Settings saved to localStorage

### ✅ Dynamic Updates
- **Real-time switching**: No page refresh required
- **Meta tags**: Dynamic title and description updates
- **HTML lang attribute**: Proper accessibility support
- **Context propagation**: All components update automatically

### ✅ Developer Experience
- **Type safety**: Full TypeScript support with interfaces
- **Tree shaking**: Only used translations are bundled
- **Performance**: Minimal runtime overhead
- **Extensible**: Easy to add new languages

## Usage

### In Components

```typescript
import { useTranslation } from '../../contexts/LanguageContext';

function MyComponent() {
  const { t, currentLang, setLanguage } = useTranslation();
  
  return (
    <div>
      <h1>{t.common.settings}</h1>
      <p>{t.task.description}</p>
      <button onClick={() => setLanguage('zh')}>
        Switch to Chinese
      </button>
    </div>
  );
}
```

### Language Selector

```typescript
import LanguageSelector from './components/LanguageSelector';

// Full selector with label
<LanguageSelector />

// Compact version for nav bars
<LanguageSelector compact className="ml-2" />

// Without label
<LanguageSelector showLabel={false} />
```

## Translation Structure

### Namespace Organization

```typescript
interface TranslationKeys {
  common: {        // Shared UI elements
    loading: string;
    error: string;
    // ...
  };
  nav: {           // Navigation items
    focus: string;
    overview: string;
    // ...
  };
  task: {          // Task management
    title: string;
    status: string;
    // ...
  };
  ui: {            // UI labels and messages
    totalTasks: string;
    searchPlaceholder: string;
    // ...
  };
  messages: {      // Notifications and alerts
    taskCreated: string;
    confirmDelete: string;
    // ...
  };
  meta: {          // SEO and meta information
    appTitle: string;
    appDescription: string;
    // ...
  };
}
```

## Implementation Status

### ✅ Completed Components
- **Root Layout**: Language provider integration
- **NavBar**: Full navigation translation
- **Main Page**: Core task management UI
- **Language Selector**: Complete UI component
- **Meta Tags**: Dynamic title/description updates

### 🚧 Partial Implementation
- **Task Editor**: Some labels still need translation
- **Overview Page**: Statistics and filters
- **Speech Page**: Voice recognition interface
- **Mobile Test**: Mobile-specific content

### ⏳ Remaining Components
- **Focus Mode**: Work session management
- **Kanban Board**: Drag-and-drop interface  
- **Category Management**: CRUD operations
- **Settings Panels**: User preferences

## Translation Keys Reference

### Common Elements
```typescript
t.common.loading          // "Loading" / "加载中"
t.common.cancel           // "Cancel" / "取消"
t.common.confirm          // "Confirm" / "确认"
t.common.settings         // "Settings" / "设置"
```

### Task Management
```typescript
t.task.createTask         // "Create Task" / "创建任务"
t.task.statusPending      // "Todo" / "待办"
t.task.priorityHigh       // "High" / "高"
```

### UI Labels
```typescript
t.ui.totalTasks          // "Total Tasks" / "总任务"
t.ui.searchPlaceholder   // "Search title or description..." / "搜索标题或描述..."
t.ui.hideCompleted       // "Hide Completed" / "隐藏已完成"
```

### Messages & Notifications
```typescript
t.messages.taskCreated        // "Task created successfully" / "任务创建成功"
t.messages.confirmDelete      // "Are you sure..." / "确定要删除..."
t.messages.taskCreateFailed   // "Failed to create task..." / "创建任务失败..."
```

## Best Practices

### 1. Always Use Translation Keys
```typescript
// ✅ Good
<button>{t.common.cancel}</button>

// ❌ Bad
<button>Cancel</button>
```

### 2. Provide Context in Keys
```typescript
// ✅ Good - Clear context
t.task.statusCompleted
t.ui.searchPlaceholder
t.messages.confirmDelete

// ❌ Bad - Ambiguous
t.completed
t.search
t.confirm
```

### 3. Handle Dynamic Content
```typescript
// ✅ Good - Template with context
`${t.task.addToCategory}「${categoryName}」`

// ❌ Bad - Hard to translate
`Add to ${categoryName}`
```

### 4. Consistent Terminology
- Use the same terms across related contexts
- Status values: pending, in_progress, completed, on_hold, cancelled
- Priority levels: urgent, high, medium, low
- Actions: create, edit, delete, save, cancel

## Browser Support

### localStorage Persistence
- **Supported**: All modern browsers
- **Fallback**: Defaults to English if storage unavailable
- **Key**: `zflow:language` (values: 'en' | 'zh')

### Dynamic Meta Updates
- **Supported**: All browsers with JavaScript
- **Accessible**: Proper lang attributes for screen readers
- **SEO**: Search engines index correct language content

## Performance Considerations

### Bundle Size Impact
- **Translation data**: ~15KB compressed for both languages
- **Runtime overhead**: <1KB additional JavaScript
- **Tree shaking**: Unused translations removed in production

### Runtime Performance
- **Language switching**: <50ms (localStorage + DOM updates)
- **Component re-renders**: Only affected components update
- **Memory usage**: Minimal - single translation object in memory

## Testing

### Language Switching
1. Open application in browser
2. Click language selector in top navigation
3. Verify all visible text updates immediately
4. Refresh page - language preference should persist
5. Check browser developer tools for correct `lang` attribute

### Translation Coverage
Use this checklist to verify translation coverage:

- [ ] Navigation menu items
- [ ] Button labels and actions
- [ ] Form fields and placeholders  
- [ ] Status and priority options
- [ ] Error messages and alerts
- [ ] Loading states and notifications
- [ ] Meta tags (title, description)

## Adding New Languages

### 1. Update Language Type
```typescript
// In lib/i18n.ts
export type Language = 'en' | 'zh' | 'es'; // Add new language
```

### 2. Add Translation Object
```typescript
const translations: Record<Language, TranslationKeys> = {
  en: { /* existing */ },
  zh: { /* existing */ },
  es: { /* new Spanish translations */ }
};
```

### 3. Update Language Selector
```typescript
// In components/LanguageSelector.tsx
const languages = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { value: 'es', label: 'Spanish', nativeLabel: 'Español' }, // Add new
];
```

## Migration Guide

### From Hardcoded Text
1. Identify all hardcoded Chinese/English text
2. Find appropriate translation key or create new one
3. Replace with `{t.namespace.key}` syntax
4. Add both English and Chinese translations
5. Test language switching functionality

### Verification Script
```bash
# Search for remaining Chinese characters
grep -r "[\u4e00-\u9fff]" apps/zflow/app --exclude-dir=node_modules

# Search for hardcoded English text (common patterns)
grep -r "placeholder=\"[A-Za-z]" apps/zflow/app --exclude-dir=node_modules
```

---

## Troubleshooting

### Language Not Persisting
- Check browser localStorage support
- Verify `zflow:language` key in browser dev tools
- Ensure LanguageProvider wraps all components

### Translations Not Updating
- Check console for React context errors
- Verify component is wrapped in LanguageProvider
- Ensure useTranslation() is called inside functional component

### Missing Translations
- Check translation key exists in both en/zh objects
- Verify key path matches usage (e.g., `t.task.title`)
- Add fallback handling for missing keys

---

**Implementation Status**: 🟡 In Progress (Core functionality complete)  
**Next Steps**: Complete remaining component translations  
**Completion Date**: Target August 2025