---
title: "React 19 API Changes"
impact: MEDIUM
impactDescription: "cleaner component definitions and context usage"
tags: "react19, refs, context, hooks, composition"
appliesTo: [react-web, vite-react, nextjs-app-router]
runtime: universal
minReact: 19
incompatibleWith: ["react<19"]
---

## React 19 API Changes

> **⚠️ React 19+ only.** Skip this if you're on React 18 or earlier.

In React 19, function components can accept `ref` as a normal prop, which often removes the need for `forwardRef` in new code. `forwardRef` still works and remains useful for backward compatibility.

`use()` can read context values, but it does not remove support for `useContext()`. Use whichever is clearer for your team conventions.

**Compatible, but often unnecessary in new React 19 code:**

```tsx
const SearchInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
  return <input ref={ref} {...props} />
})
```

**React 19 style (ref as a regular prop):**

```tsx
function SearchInput({
  ref,
  ...props
}: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />
}
```

**Both are valid in React 19:**

```tsx
const valueA = useContext(MyContext)
const valueB = use(MyContext)
```

`use()` can also be called conditionally, unlike `useContext()`.
