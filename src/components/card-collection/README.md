# Card Collection Component

A dynamic, flexible card collection component similar to Swift UIKit's `UICollectionView` or SwiftUI's `Grid`. This component provides a responsive grid layout system that adapts to different screen sizes and data types.

## Features

- 🎯 **Dynamic Data Handling** - Works with any array of objects
- 📱 **Responsive Design** - Configurable columns for different screen sizes
- 🔄 **Multiple Directions** - Horizontal and vertical layouts
- ⚡ **Performance Optimized** - Optional virtualization for large datasets
- 🎨 **Highly Customizable** - Custom rendering, styling, and animations
- 📦 **Loading States** - Built-in skeleton loading
- 🚫 **Empty States** - Customizable empty state components
- ✨ **Animations** - Smooth transitions and fade-in effects

## Basic Usage

```tsx
import { CardCollection } from '@/components/card-collection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Product {
  id: number;
  name: string;
  price: number;
}

const products: Product[] = [
  { id: 1, name: 'MacBook Pro', price: 2499 },
  { id: 2, name: 'iPhone 15', price: 999 },
];

export function ProductGrid() {
  const renderCard = (product: Product) => (
    <Card>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>${product.price}</p>
      </CardContent>
    </Card>
  );

  return (
    <CardCollection
      data={products}
      renderCard={renderCard}
      columns={{ default: 1, md: 2, lg: 3 }}
      gap="md"
    />
  );
}
```

## Advanced Usage

### Responsive Grid Layout

```tsx
<CardCollection
  data={products}
  renderCard={renderProductCard}
  columns={{
    default: 1,    // 1 column on mobile
    sm: 2,         // 2 columns on small screens
    md: 3,         // 3 columns on medium screens
    lg: 4,         // 4 columns on large screens
    xl: 5,         // 5 columns on extra large screens
    '2xl': 6,      // 6 columns on 2xl screens
  }}
  gap="lg"
/>
```

### Horizontal Scrolling

```tsx
<CardCollection
  data={products}
  renderCard={renderProductCard}
  direction="horizontal"
  gap="md"
  className="pb-4" // Add padding for scrollbar
/>
```

### Loading States

```tsx
<CardCollection
  data={products}
  renderCard={renderProductCard}
  loading={isLoading}
  loadingCount={6} // Number of skeleton cards to show
/>
```

### Empty States

```tsx
<CardCollection
  data={products}
  renderCard={renderProductCard}
  emptyState={
    <div className="text-center py-12">
      <h3 className="text-lg font-medium mb-2">No products found</h3>
      <p className="text-muted-foreground">Try adjusting your search criteria.</p>
    </div>
  }
/>
```

### Virtualization for Large Datasets

```tsx
<CardCollection
  data={largeDataset}
  renderCard={renderCard}
  virtualized={true}
  height={600}
  itemHeight={200}
/>
```

## Props Reference

### CardCollectionProps<T>

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | **required** | Array of data items to display |
| `renderCard` | `(item: T, index: number) => ReactNode` | **required** | Function to render each card |
| `columns` | `ColumnsConfig` | Responsive default | Number of columns configuration |
| `direction` | `'horizontal' \| 'vertical'` | `'vertical'` | Layout direction |
| `gap` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Gap between cards |
| `className` | `string` | `undefined` | Custom CSS classes |
| `loading` | `boolean` | `false` | Show loading skeleton |
| `emptyState` | `ReactNode` | Built-in empty state | Custom empty state content |
| `loadingCount` | `number` | `6` | Number of skeleton cards |
| `animate` | `boolean` | `true` | Enable animations |
| `virtualized` | `boolean` | `false` | Enable virtualization |
| `height` | `number` | `400` | Container height for virtualization |
| `itemHeight` | `number` | `200` | Estimated item height |

### ColumnsConfig

```tsx
interface ColumnsConfig {
  default: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  '2xl'?: number;
}
```

## Presets

The component includes several preset configurations:

```tsx
import { CardCollectionPresets } from '@/components/card-collection';

// Use preset configurations
<CardCollection
  data={data}
  renderCard={renderCard}
  columns={CardCollectionPresets.responsive} // 1,2,3,4,5,6 columns
/>

<CardCollection
  columns={CardCollectionPresets.single} // Always 1 column
/>

<CardCollection
  columns={CardCollectionPresets.triple} // Always 3 columns
/>
```

Available presets:
- `responsive` - Mobile-first responsive (1→6 columns)
- `single` - Single column
- `double` - Two columns
- `triple` - Three columns
- `quad` - Four columns

## Examples

### Product Grid

```tsx
import { ProductGridExample } from '@/components/card-collection/card-collection.examples';

export function MyPage() {
  return <ProductGridExample />;
}
```

### User Cards

```tsx
import { UserCardsExample } from '@/components/card-collection/card-collection.examples';

export function TeamPage() {
  return <UserCardsExample />;
}
```

### Horizontal Scrolling

```tsx
import { HorizontalScrollExample } from '@/components/card-collection/card-collection.examples';

export function FeaturedSection() {
  return <HorizontalScrollExample />;
}
```

### Dashboard Stats

```tsx
import { StatsCardsExample } from '@/components/card-collection/card-collection.examples';

export function Dashboard() {
  return <StatsCardsExample />;
}
```

## Styling

The component uses Tailwind CSS classes and can be customized through:

1. **Custom className** - Pass additional classes via the `className` prop
2. **Gap sizes** - Use predefined gap sizes (`none`, `sm`, `md`, `lg`, `xl`)
3. **Card styling** - Style individual cards in your `renderCard` function
4. **Container styling** - Override default grid classes

### Custom Styling Example

```tsx
<CardCollection
  data={items}
  renderCard={renderCustomCard}
  className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg"
  gap="xl"
  animate={true}
/>
```

## Performance Considerations

- **Virtualization**: Enable for datasets with 50+ items
- **Animations**: Disable for better performance on low-end devices
- **Image optimization**: Use Next.js Image component for card images
- **Memoization**: Wrap heavy `renderCard` functions with `useCallback`

```tsx
const renderCard = useCallback((item: Product) => (
  <ProductCard product={item} />
), []);
```

## Accessibility

The component follows accessibility best practices:

- Proper semantic HTML structure
- Keyboard navigation support
- Screen reader friendly
- Focus management
- ARIA attributes where appropriate

## TypeScript Support

The component is fully typed with TypeScript generics:

```tsx
interface MyItem extends CardCollectionItem {
  id: string;
  title: string;
  // ... other properties
}

<CardCollection<MyItem>
  data={myItems}
  renderCard={(item) => {
    // item is properly typed as MyItem
    return <div>{item.title}</div>;
  }}
/>
```

## Common Patterns

### Loading with Skeleton

```tsx
function MyGrid() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  return (
    <CardCollection
      data={data}
      renderCard={renderCard}
      loading={loading}
      loadingCount={8}
    />
  );
}
```

### Search and Filter

```tsx
function SearchableGrid() {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />
      <CardCollection
        data={filteredData}
        renderCard={renderCard}
        emptyState={<div>No results found for "{searchTerm}"</div>}
      />
    </>
  );
}
```

### Pagination

```tsx
function PaginatedGrid() {
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;
  const paginatedData = data.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <>
      <CardCollection
        data={paginatedData}
        renderCard={renderCard}
      />
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(data.length / itemsPerPage)}
        onPageChange={setPage}
      />
    </>
  );
}
```

## Migration Guide

If you're migrating from other grid components:

### From CSS Grid

```tsx
// Before
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</div>

// After
<CardCollection
  data={items}
  renderCard={(item) => <ItemCard item={item} />}
  columns={{ default: 1, md: 3 }}
  gap="md"
/>
```

### From Flexbox Layout

```tsx
// Before
<div className="flex flex-wrap gap-4">
  {items.map(item => <div key={item.id} className="flex-1 min-w-64"><ItemCard item={item} /></div>)}
</div>

// After
<CardCollection
  data={items}
  renderCard={(item) => <ItemCard item={item} />}
  columns={CardCollectionPresets.responsive}
  gap="md"
/>
```

## Troubleshooting

### Common Issues

**Cards not rendering:**
- Ensure your data has unique `id` properties
- Check that `renderCard` returns valid JSX

**Layout issues:**
- Verify Tailwind CSS classes are available
- Check for conflicting CSS styles

**Performance issues:**
- Enable virtualization for large datasets
- Disable animations on low-end devices
- Use `useCallback` for `renderCard` function

**TypeScript errors:**
- Ensure your data interface extends `CardCollectionItem`
- Check that all required props are provided

### Debug Mode

Add debug information to your cards:

```tsx
const renderCard = (item: Product, index: number) => (
  <Card>
    <div className="text-xs text-muted-foreground">
      Index: {index}, ID: {item.id}
    </div>
    {/* ... rest of card content */}
  </Card>
);
```
