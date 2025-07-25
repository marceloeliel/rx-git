// Tipos para a API do Asaas

// Customer (Cliente)
export interface AsaasCustomer {
  id?: string
  name: string
  email: string
  phone?: string
  mobilePhone?: string
  cpfCnpj: string
  postalCode?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  city?: string
  state?: string
  country?: string
  externalReference?: string
  notificationDisabled?: boolean
  additionalEmails?: string
  municipalInscription?: string
  stateInscription?: string
  observations?: string
}

// Payment (Cobrança)
export interface AsaasPayment {
  id?: string
  customer: string
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'TRANSFER' | 'DEBIT_CARD'
  value: number
  dueDate: string
  description?: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
  postalService?: boolean
  split?: Array<{
    walletId: string
    fixedValue?: number
    percentualValue?: number
    totalValue?: number
  }>
  callback?: {
    successUrl?: string
    autoRedirect?: boolean
  }
  // Campos de resposta
  status?: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'REFUND_IN_PROGRESS' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_RECEIVED' | 'DUNNING_REQUESTED' | 'AWAITING_RISK_ANALYSIS'
  pixTransaction?: {
    qrCode?: {
      encodedImage?: string
      payload?: string
    }
    txid?: string
    expirationDate?: string
  }
  invoiceUrl?: string
  bankSlipUrl?: string
  netValue?: number
  nossoNumero?: string
  dateCreated?: string
  paymentDate?: string
  clientPaymentDate?: string
  installmentNumber?: number
  creditDate?: string
  estimatedCreditDate?: string
  transactionReceiptUrl?: string
  originalValue?: number
  interestValue?: number
  originalDueDate?: string
  paymentLink?: string
  daysAfterDueDate?: number
  invoiceNumber?: string
  deleted?: boolean
  anticipated?: boolean
  anticipable?: boolean
  creditCard?: {
    creditCardNumber?: string
    creditCardBrand?: string
    creditCardToken?: string
  }
}

// Resposta da API
export interface AsaasApiResponse<T> {
  object?: string
  hasMore?: boolean
  totalCount?: number
  limit?: number
  offset?: number
  data?: T[]
}

// Erro da API
export interface AsaasError {
  code: string
  description: string
  parameter?: string
}

export interface AsaasErrorResponse {
  errors: AsaasError[]
}

// Request para criar cobrança PIX
export interface CreatePixPaymentRequest {
  customer: string
  billingType: 'PIX'
  value: number
  dueDate: string
  description?: string
  externalReference?: string
}

// Response de cobrança PIX
export interface PixPaymentResponse extends AsaasPayment {
  pixTransaction?: {
    qrCode?: {
      encodedImage?: string
      payload?: string
    }
    txid?: string
    expirationDate?: string
  }
} 