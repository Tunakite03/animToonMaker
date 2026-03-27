---
title: "Hoist callbacks to the root of lists"
impact: MEDIUM
impactDescription: "Fewer re-renders and faster lists"
tags: react-native
appliesTo: [react-native, expo]
runtime: native
minReact: 18
incompatibleWith: [react-dom-only-web]
---

## Hoist Callbacks to the Root of Lists

**Impact: MEDIUM (Fewer re-renders and faster lists)**

When passing callback functions to list items, create a single instance of the
callback at the root of the list. Items should then call it with a unique
identifier.

**Incorrect (creates a new callback on each render):**

```typescript
return (
  <LegendList
    renderItem={({ item }) => {
      // bad: creates a new callback on each render
      const onPress = () => handlePress(item.id)
      return <Item key={item.id} item={item} onPress={onPress} />
    }}
  />
)
```

**Correct (a single function instance passed to each item):**

```typescript
const onItemPress = useCallback(
  (id: string) => {
    handlePress(id)
  },
  [handlePress]
)

return (
  <LegendList
    renderItem={({ item }) => (
      <Item key={item.id} item={item} onPress={onItemPress} />
    )}
  />
)
```

The callback instance is stable at the list root. Each item passes its own `id` when pressed.

Reference: [Optimizing FlatList Configuration](https://reactnative.dev/docs/optimizing-flatlist-configuration)
