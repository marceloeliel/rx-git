import { createClient } from './client'

const supabase = createClient()

export interface UserSubscription {
  id: string
  user_id: string
  plan_type: 'basico' | 'premium' | 'premium_plus' | 'ilimitado'
  plan_value: number
  start_date: string
  end_date: string
  status: 'active' | 'pending_payment' | 'blocked' | 'cancelled'
  last_payment_id?: string
  asaas_customer_id?: string
  grace_period_ends_at?: string
  created_at: string
  updated_at: string
}

export interface PlanConfig {
  basico: { value: number; name: string }
  premium: { value: number; name: string }
  premium_plus: { value: number; name: string }
  ilimitado: { value: number; name: string }
}

export const PLAN_CONFIGS: PlanConfig = {
  basico: { value: 59.90, name: 'Básico' },
  premium: { value: 299.00, name: 'Premium' },
  premium_plus: { value: 897.90, name: 'Premium Plus' },
  ilimitado: { value: 1897.90, name: 'Ilimitado' }
}

// Buscar assinatura ativa do usuário
export async function getUserActiveSubscription(userId: string): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'pending_payment'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar assinatura:', error)
    return null
  }

  return data
}

// Criar nova assinatura
export async function createSubscription(
  userId: string, 
  planType: keyof PlanConfig,
  asaasCustomerId?: string
): Promise<UserSubscription | null> {
  const planConfig = PLAN_CONFIGS[planType]
  const startDate = new Date()
  const endDate = new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 dias

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      plan_type: planType,
      plan_value: planConfig.value,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: 'active',
      asaas_customer_id: asaasCustomerId
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar assinatura:', error)
    return null
  }

  return data
}

// Atualizar status da assinatura
export async function updateSubscriptionStatus(
  subscriptionId: string, 
  status: UserSubscription['status'],
  paymentId?: string
): Promise<boolean> {
  const updateData: any = { status }
  
  if (paymentId) {
    updateData.last_payment_id = paymentId
  }

  // Se mudou para pending_payment, calcular grace period
  if (status === 'pending_payment') {
    const gracePeriodEnd = new Date()
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 5) // 5 dias de tolerância
    updateData.grace_period_ends_at = gracePeriodEnd.toISOString()
  }

  const { error } = await supabase
    .from('user_subscriptions')
    .update(updateData)
    .eq('id', subscriptionId)

  if (error) {
    console.error('Erro ao atualizar status da assinatura:', error)
    return false
  }

  return true
}

// Renovar assinatura (criar cobrança para próximo período)
export async function renewSubscription(subscriptionId: string): Promise<boolean> {
  const { data: subscription, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single()

  if (error || !subscription) {
    console.error('Erro ao buscar assinatura para renovação:', error)
    return false
  }

  // Calcular novas datas (próximos 30 dias)
  const newStartDate = new Date(subscription.end_date)
  const newEndDate = new Date(newStartDate.getTime() + (30 * 24 * 60 * 60 * 1000))

  const { error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      start_date: newStartDate.toISOString(),
      end_date: newEndDate.toISOString(),
      status: 'pending_payment',
      grace_period_ends_at: new Date(newEndDate.getTime() + (5 * 24 * 60 * 60 * 1000)).toISOString()
    })
    .eq('id', subscriptionId)

  if (updateError) {
    console.error('Erro ao renovar assinatura:', updateError)
    return false
  }

  return true
}

// Verificar se usuário tem acesso (não está bloqueado)
export async function checkUserAccess(userId: string): Promise<{
  hasAccess: boolean
  subscription: UserSubscription | null
  reason?: string
}> {
  const subscription = await getUserActiveSubscription(userId)

  if (!subscription) {
    return {
      hasAccess: false,
      subscription: null,
      reason: 'Nenhuma assinatura ativa encontrada'
    }
  }

  const now = new Date()
  const endDate = new Date(subscription.end_date)
  const gracePeriodEnd = subscription.grace_period_ends_at ? new Date(subscription.grace_period_ends_at) : null

  // Se status é blocked, bloquear acesso
  if (subscription.status === 'blocked') {
    return {
      hasAccess: false,
      subscription,
      reason: 'Assinatura bloqueada por falta de pagamento'
    }
  }

  // Se status é active, permitir acesso
  if (subscription.status === 'active') {
    return {
      hasAccess: true,
      subscription
    }
  }

  // Se status é pending_payment
  if (subscription.status === 'pending_payment') {
    // Se ainda está no período de tolerância, permitir acesso
    if (gracePeriodEnd && now <= gracePeriodEnd) {
      return {
        hasAccess: true,
        subscription,
        reason: `Pagamento pendente. Acesso liberado até ${gracePeriodEnd.toLocaleDateString('pt-BR')}`
      }
    } else {
      // Período de tolerância expirou, bloquear
      return {
        hasAccess: false,
        subscription,
        reason: 'Período de tolerância expirado. Efetue o pagamento para reativar.'
      }
    }
  }

  return {
    hasAccess: false,
    subscription,
    reason: 'Status de assinatura inválido'
  }
}

// Buscar assinaturas que venceram (para processo automático)
export async function getExpiredSubscriptions(): Promise<UserSubscription[]> {
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('status', 'active')
    .lt('end_date', now)

  if (error) {
    console.error('Erro ao buscar assinaturas expiradas:', error)
    return []
  }

  return data || []
}

// Buscar assinaturas que excederam período de tolerância
export async function getBlockableSubscriptions(): Promise<UserSubscription[]> {
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('status', 'pending_payment')
    .not('grace_period_ends_at', 'is', null)
    .lt('grace_period_ends_at', now)

  if (error) {
    console.error('Erro ao buscar assinaturas para bloqueio:', error)
    return []
  }

  return data || []
} 