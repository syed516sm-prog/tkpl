/** The subset of the Supabase service-role client the receipt lookup needs. */
export interface ReceiptLookupClient {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: any; error: any }>;
}

/**
 * Reads the receipt payload for a registration. Shared by the browser
 * verification handler and the background reconcile pass so both return the
 * exact same shape.
 *
 * The phone and date of birth never leave the server: they are read here only
 * to satisfy the same three-factor gate the public receipt page uses.
 */
export async function loadReceiptForRegistration(
  supabase: ReceiptLookupClient,
  registrationNo: string
): Promise<{ ok: true; receipt: Record<string, unknown> } | { ok: false }> {
  if (!registrationNo) return { ok: false };

  const ownerResult = await supabase
    .from('players')
    .select('registration_no, phone, date_of_birth')
    .eq('registration_no', registrationNo)
    .maybeSingle();
  const owner = ownerResult.data as
    | { registration_no?: string; phone?: string; date_of_birth?: string }
    | null;
  if (!owner?.registration_no) return { ok: false };

  const result = await supabase.rpc('get_receipt', {
    p_registration_no: owner.registration_no,
    p_phone: owner.phone,
    p_date_of_birth: owner.date_of_birth,
  });
  if (result.error || !result.data) return { ok: false };
  return { ok: true, receipt: result.data as Record<string, unknown> };
}
