import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const cartItems = localStorage.getItem('@RocketShoes:cart');

    if (!cartItems) {
      return [];
    }

    return JSON.parse(cartItems);
  });

  const checkStockAvailability = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    const response = await api.get(`/stock/${productId}`);
    const { amount: stockAmount } = response.data;

    if(amount > stockAmount) {
      throw new Error('ProductAmountError');
    }
  }

  const saveCartOnLocalStorage = (cart: Product[]) => {
    console.log('localStorage', cart);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  }

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);
      
      if (productInCart) {
        await updateProductAmount({
          productId: productInCart.id,
          amount: productInCart.amount + 1
        });
        return;
      }

      const response = await api.get(`/products/${productId}`);
      const product = { ...response.data, amount: 1 };

      await checkStockAvailability({ productId, amount: product.amount });
      const newCart = [...cart, product];
      setCart(newCart);
      saveCartOnLocalStorage(newCart);
    }
    catch (error) {
      switch(error.message) {
        case 'ProductAmountError':
          toast.error('Quantidade solicitada fora de estoque');
          return;
        default:
          toast.error('Erro na adição do produto');
          return;
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId);
      if (newCart.length !== cart.length -1) {
        throw new Error('RemoveProductError');
      }
      setCart(newCart);
      saveCartOnLocalStorage(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      await checkStockAvailability({ productId, amount });

      if (amount < 1) {
        throw new Error('ProductAmountLessThenOne');
      }

      const newCart = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      });
      setCart(newCart);
      saveCartOnLocalStorage(newCart);
    } catch(error) {
      switch(error.message) {
        case 'ProductAmountError':
          toast.error('Quantidade solicitada fora de estoque');
          return;
        default:
          toast.error('Erro na alteração de quantidade do produto');
          return;
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
