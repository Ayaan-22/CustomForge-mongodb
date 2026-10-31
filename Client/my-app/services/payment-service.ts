import {apiFetch,type ApiResponse} from '@/lib/apiClient';
export type StripePaymentMethod={id:string;type:'card';card:{brand:string;last4:string;exp_month:number;exp_year:number}};
export const PaymentService={
  capabilities():Promise<ApiResponse<{cod:boolean;stripe:boolean;savedCards:boolean;paypal:boolean}>> {
    return apiFetch('/payment/capabilities',{method:'GET',skipAuth:true});
  },
  createStripeSession(payload:{orderId:string}):Promise<ApiResponse<{sessionId:string;url:string}>> {
    return apiFetch('/payment/create-stripe-session',{method:'POST',body:payload});
  },
  getPaymentMethods():Promise<ApiResponse<StripePaymentMethod[]>> {
    return apiFetch('/payment/payment-methods',{method:'GET'});
  },
};
