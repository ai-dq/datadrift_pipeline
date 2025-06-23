'use client';

import * as React from 'react';
import { CardCollection, CardCollectionPresets, type CardCollectionItem } from './card-collection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Example data interfaces
interface Product extends CardCollectionItem {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  inStock: boolean;
}

interface User extends CardCollectionItem {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: 'active' | 'inactive';
}

// Sample data
const sampleProducts: Product[] = [
  {
    id: 1,
    name: 'MacBook Pro',
    price: 2499,
    category: 'Electronics',
    image: '/api/placeholder/300/200',
    description: 'Powerful laptop for professionals',
    inStock: true,
  },
  {
    id: 2,
    name: 'iPhone 15',
    price: 999,
    category: 'Electronics',
    image: '/api/placeholder/300/200',
    description: 'Latest smartphone with advanced features',
    inStock: true,
  },
  {
    id: 3,
    name: 'AirPods Pro',
    price: 249,
    category: 'Audio',
    image: '/api/placeholder/300/200',
    description: 'Wireless earbuds with noise cancellation',
    inStock: false,
  },
  {
    id: 4,
    name: 'iPad Air',
    price: 599,
    category: 'Electronics',
    image: '/api/placeholder/300/200',
    description: 'Versatile tablet for work and play',
    inStock: true,
  },
  {
    id: 5,
    name: 'Apple Watch',
    price: 399,
    category: 'Wearables',
    image: '/api/placeholder/300/200',
    description: 'Smart watch with health tracking',
    inStock: true,
  },
  {
    id: 6,
    name: 'Magic Keyboard',
    price: 129,
    category: 'Accessories',
    image: '/api/placeholder/300/200',
    description: 'Wireless keyboard with backlight',
    inStock: false,
  },
];

const sampleUsers: User[] = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/api/placeholder/100/100',
    role: 'Admin',
    status: 'active',
  },
  {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: '/api/placeholder/100/100',
    role: 'Editor',
    status: 'active',
  },
  {
    id: 'user-3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    avatar: '/api/placeholder/100/100',
    role: 'Viewer',
    status: 'inactive',
  },
  {
    id: 'user-4',
    name: 'Alice Brown',
    email: 'alice@example.com',
    avatar: '/api/placeholder/100/100',
    role: 'Editor',
    status: 'active',
  },
];

// Example 1: Product Grid
export function ProductGridExample() {
  const [loading, setLoading] = React.useState(false);

  const renderProductCard = (product: Product) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video bg-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
        {!product.inStock && (
          <Badge variant="secondary" className="absolute top-2 right-2">
            Out of Stock
          </Badge>
        )}
      </div>
      <CardHeader>
        <CardTitle className="text-lg">{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">${product.price}</span>
          <Badge variant="outline">{product.category}</Badge>
        </div>
        <Button className="w-full mt-4" disabled={!product.inStock}>
          {product.inStock ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Products</h2>
        <Button onClick={() => setLoading(!loading)}>
          Toggle Loading
        </Button>
      </div>

      <CardCollection
        data={sampleProducts}
        renderCard={renderProductCard}
        columns={CardCollectionPresets.responsive}
        gap="lg"
        loading={loading}
        animate={true}
      />
    </div>
  );
}

// Example 2: User Cards with Custom Layout
export function UserCardsExample() {
  const renderUserCard = (user: User) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
            {user.name.charAt(0)}
          </div>
          <div>
            <CardTitle className="text-base">{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
            {user.status}
          </Badge>
          <span className="text-sm text-muted-foreground">{user.role}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Team Members</h2>

      <CardCollection
        data={sampleUsers}
        renderCard={renderUserCard}
        columns={{ default: 1, md: 2, lg: 3 }}
        gap="md"
      />
    </div>
  );
}

// Example 3: Horizontal Scrolling Cards
export function HorizontalScrollExample() {
  const renderCompactCard = (product: Product) => (
    <Card className="w-64 flex-shrink-0">
      <div className="aspect-video bg-muted" />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{product.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="font-bold">${product.price}</span>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Featured Products</h2>

      <CardCollection
        data={sampleProducts}
        renderCard={renderCompactCard}
        direction="horizontal"
        gap="md"
        className="pb-4"
      />
    </div>
  );
}

// Example 4: Empty State
export function EmptyStateExample() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Empty Collection</h2>

      <CardCollection
        data={[]}
        renderCard={() => null}
        columns={CardCollectionPresets.responsive}
        emptyState={
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No products available</h3>
            <p className="text-muted-foreground mb-4">
              Check back later for new products.
            </p>
            <Button>Browse Categories</Button>
          </div>
        }
      />
    </div>
  );
}

// Example 5: Custom Grid Layout
export function CustomGridExample() {
  const renderMiniCard = (product: Product) => (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">{product.name}</h4>
          <p className="text-xs text-muted-foreground">{product.category}</p>
        </div>
        <span className="font-bold text-sm">${product.price}</span>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dense Grid Layout</h2>

      <CardCollection
        data={sampleProducts}
        renderCard={renderMiniCard}
        columns={{ default: 2, sm: 3, md: 4, lg: 6, xl: 8 }}
        gap="sm"
        animate={true}
      />
    </div>
  );
}

// Example 6: Dashboard Stats Cards
export function StatsCardsExample() {
  const statsData = [
    { id: 1, title: 'Total Revenue', value: '$124,563', change: '+12%', trend: 'up' },
    { id: 2, title: 'Active Users', value: '2,345', change: '+5%', trend: 'up' },
    { id: 3, title: 'Orders', value: '1,234', change: '-2%', trend: 'down' },
    { id: 4, title: 'Conversion Rate', value: '3.2%', change: '+0.5%', trend: 'up' },
  ];

  const renderStatCard = (stat: any) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{stat.value}</span>
          <Badge variant={stat.trend === 'up' ? 'default' : 'secondary'}>
            {stat.change}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard Stats</h2>

      <CardCollection
        data={statsData}
        renderCard={renderStatCard}
        columns={{ default: 1, sm: 2, lg: 4 }}
        gap="md"
      />
    </div>
  );
}

// Example 7: All Examples Combined
export function AllExamplesDemo() {
  return (
    <div className="space-y-12 p-6">
      <ProductGridExample />
      <UserCardsExample />
      <HorizontalScrollExample />
      <CustomGridExample />
      <StatsCardsExample />
      <EmptyStateExample />
    </div>
  );
}
