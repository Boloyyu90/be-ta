/**
 * Type declarations for midtrans-client
 *
 * The midtrans-client package doesn't have official TypeScript types,
 * so we define them here.
 *
 * Place this file in: src/shared/types/midtrans-client.d.ts
 * Or add to your existing types folder
 */

declare module 'midtrans-client' {
  interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  interface SnapTransactionResponse {
    token: string;
    redirect_url: string;
  }

  interface TransactionStatusResponse {
    transaction_time: string;
    transaction_status: string;
    transaction_id: string;
    status_message: string;
    status_code: string;
    signature_key: string;
    payment_type: string;
    order_id: string;
    merchant_id: string;
    gross_amount: string;
    fraud_status?: string;
    currency: string;
    va_numbers?: Array<{
      va_number: string;
      bank: string;
    }>;
    issuer?: string;
    acquirer?: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface CustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    billing_address?: Address;
    shipping_address?: Address;
  }

  interface Address {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country_code?: string;
  }

  interface ItemDetails {
    id: string;
    price: number;
    quantity: number;
    name: string;
    brand?: string;
    category?: string;
    merchant_name?: string;
  }

  interface ExpiryDetails {
    unit: 'minute' | 'hour' | 'day';
    duration: number;
  }

  interface CallbackDetails {
    finish?: string;
    error?: string;
    pending?: string;
  }

  interface SnapParameter {
    transaction_details: TransactionDetails;
    customer_details?: CustomerDetails;
    item_details?: ItemDetails[];
    enabled_payments?: string[];
    credit_card?: {
      secure?: boolean;
      save_card?: boolean;
    };
    expiry?: ExpiryDetails;
    callbacks?: CallbackDetails;
  }

  class Snap {
    constructor(config: MidtransConfig);
    createTransaction(parameter: SnapParameter): Promise<SnapTransactionResponse>;
    createTransactionToken(parameter: SnapParameter): Promise<string>;
    createTransactionRedirectUrl(parameter: SnapParameter): Promise<string>;
  }

  interface CoreApiTransaction {
    status(orderId: string): Promise<TransactionStatusResponse>;
    cancel(orderId: string): Promise<TransactionStatusResponse>;
    approve(orderId: string): Promise<TransactionStatusResponse>;
    refund(orderId: string, parameter?: object): Promise<TransactionStatusResponse>;
    refundDirect(orderId: string, parameter?: object): Promise<TransactionStatusResponse>;
    deny(orderId: string): Promise<TransactionStatusResponse>;
    expire(orderId: string): Promise<TransactionStatusResponse>;
  }

  class CoreApi {
    constructor(config: MidtransConfig);
    charge(parameter: object): Promise<object>;
    capture(parameter: object): Promise<object>;
    transaction: CoreApiTransaction;
  }

  class Iris {
    constructor(config: MidtransConfig);
  }

  class MidtransError extends Error {
    httpStatusCode?: number;
    ApiResponse?: object;
    rawHttpClientData?: object;
  }
}