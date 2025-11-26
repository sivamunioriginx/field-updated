declare module 'react-native-razorpay' {
  export interface RazorpayCheckoutOptions {
    description?: string;
    image?: string;
    currency?: string;
    key: string;
    amount: number;
    name: string;
    order_id?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
  }

  export interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }

  export interface RazorpayErrorResponse {
    code: number;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: any;
  }

  const RazorpayCheckout: {
    open(options: RazorpayCheckoutOptions): Promise<RazorpaySuccessResponse>;
  };

  export default RazorpayCheckout;
}

