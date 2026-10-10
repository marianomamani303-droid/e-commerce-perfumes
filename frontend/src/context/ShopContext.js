import { createContext, useContext } from 'react';
export const ShopContext = createContext(null);
export function useShop() {
  return useContext(ShopContext);
}
