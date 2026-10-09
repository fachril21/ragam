import { getPublicClient } from "../supabase/public";
import { createCatalogRepository, type ListProductsOptions } from "./catalog";

export type * from "./catalog";

/** Storefront data access. Components call these instead of touching Supabase directly. */
const repo = () => createCatalogRepository(getPublicClient());

export const getProducts = (options?: ListProductsOptions) => repo().getProducts(options);
export const getProductBySlug = (slug: string) => repo().getProductBySlug(slug);
export const getCategories = () => repo().getCategories();
export const getStoreSettings = () => repo().getStoreSettings();
