/**
 * Client utility functions
 */

interface ClientLike {
  first_name?: string | null
  last_name?: string | null
  name?: string // For backward compatibility
}

/**
 * Get full client name from first_name and last_name
 * Falls back to 'name' field if available (legacy)
 */
export function getClientName(client: ClientLike | null | undefined): string {
  if (!client) return 'Без имени'
  
  // Legacy: if 'name' field exists, use it
  if (client.name) return client.name
  
  // Modern: combine first_name + last_name
  const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim()
  return fullName || 'Без имени'
}

/**
 * Get client initials from first_name and last_name
 */
export function getClientInitials(client: ClientLike | null | undefined): string {
  if (!client) return '??'
  
  // Legacy: if 'name' field exists, use it
  if (client.name) {
    return client.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }
  
  // Modern: use first_name + last_name
  const first = (client.first_name || '')[0]?.toUpperCase() || '?'
  const last = (client.last_name || '')[0]?.toUpperCase() || ''
  return (first + last).slice(0, 2) || '??'
}
