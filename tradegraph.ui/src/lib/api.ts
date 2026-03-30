// Central API layer - all calls route through YARP Gateway on :5000 via Next.js proxy

const BASE = '/api';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getCookie('auth_token');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Session expired or unauthorized. Please log in again.');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  contactEmail: string;
  region: string;
  isActive: boolean;
  products?: Product[];
}

export const getSuppliers = (page = 1, pageSize = 50) =>
  apiFetch<{ total: number; items: Supplier[] }>(`/suppliers?page=${page}&pageSize=${pageSize}`);

export const getSupplier = (id: string) =>
  apiFetch<Supplier>(`/suppliers/${id}`);

export const createSupplier = (data: { name: string; contactEmail: string; region: string }) =>
  apiFetch<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(data) });

export const updateSupplier = (id: string, data: { name: string; contactEmail: string; region: string; isActive: boolean }) =>
  apiFetch<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteSupplier = (id: string) =>
  apiFetch<void>(`/suppliers/${id}`, { method: 'DELETE' });

// ─── Products ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockLevel: number;
  supplierId?: string;
  supplier?: { id: string; name: string; region: string };
  createdAt: string;
  updatedAt?: string;
}

export interface PriceHistory {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  changedAt: string;
}

export const getProducts = (page = 1, pageSize = 50) =>
  apiFetch<{ total: number; items: Product[] }>(`/products?page=${page}&pageSize=${pageSize}`);

export const createProduct = (data: { name: string; sku: string; price: number; stockLevel: number; supplierId?: string }) =>
  apiFetch<Product>('/products', { method: 'POST', body: JSON.stringify(data) });

export const updateProduct = (id: string, data: { name: string; stockLevel: number; supplierId?: string }) =>
  apiFetch<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteProduct = (id: string) =>
  apiFetch<void>(`/products/${id}`, { method: 'DELETE' });

export const getPriceHistory = (id: string) =>
  apiFetch<PriceHistory[]>(`/products/${id}/price-history`);

export const updatePrice = (id: string, newPrice: number) =>
  apiFetch<void>(`/products/${id}/price`, { method: 'PUT', body: JSON.stringify({ newPrice }) });

// ─── Retailers ────────────────────────────────────────────────────────────────

export interface Retailer {
  id: string;
  name: string;
  email: string;
  region: string;
}

export const getRetailers = (page = 1, pageSize = 50) =>
  apiFetch<{ total: number; items: Retailer[] }>(`/retailers?page=${page}&pageSize=${pageSize}`);

export const createRetailer = (data: { name: string; contactEmail: string; region: string }) =>
  apiFetch<Retailer>('/retailers', { method: 'POST', body: JSON.stringify(data) });

export const updateRetailer = (id: string, data: { name: string; contactEmail: string; region: string }) =>
  apiFetch<Retailer>(`/retailers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteRetailer = (id: string) =>
  apiFetch<void>(`/retailers/${id}`, { method: 'DELETE' });

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  name: string;
  type: 'Supplier' | 'Product';
}

export interface GraphEdge {
  targetId: string;
  targetName: string;
  targetType: string;
  factor: number;
}

export const getGraphNodes = () =>
  apiFetch<GraphNode[]>('/graph/relationships/nodes');

export const getGraphEdges = (supplierId: string) =>
  apiFetch<GraphEdge[]>(`/graph/relationships/${supplierId}`);

export const createRelationship = (data: { fromSupplierId: string; toSupplierId: string; productId?: string; strength: number }) =>
  apiFetch<void>('/graph/relationships', { method: 'POST', body: JSON.stringify(data) });

export const deleteRelationship = (fromId: string, toId: string) =>
  apiFetch<void>(`/graph/relationships/${fromId}/${toId}`, { method: 'DELETE' });
