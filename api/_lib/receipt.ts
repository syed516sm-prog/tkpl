/** The subset of the Supabase service-role client the receipt lookup needs. */
export interface ReceiptLookupClient {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: any; error: any }>;
  storage?: {
    from(bucket: string): {
      getPublicUrl(path: string): { data: { publicUrl: string } };
      createSignedUrl?(path: string, expiresIn: number): PromiseLike<{ data: { signedUrl: string } | null; error: any }>;
    };
  };
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
    .select('id, registration_no, phone, date_of_birth, photo_path, full_name, locality, role, created_at')
    .eq('registration_no', registrationNo)
    .maybeSingle();
  const owner = ownerResult.data as
    | {
        id?: string;
        registration_no?: string;
        phone?: string;
        date_of_birth?: string;
        photo_path?: string;
        full_name?: string;
        locality?: string;
        role?: string;
        created_at?: string;
      }
    | null;
  if (!owner?.registration_no) return { ok: false };

  let rawReceipt: Record<string, unknown> | null = null;
  const result = await supabase.rpc('get_receipt', {
    p_registration_no: owner.registration_no,
    p_phone: owner.phone,
    p_date_of_birth: owner.date_of_birth,
  });

  if (!result.error && result.data && typeof result.data === 'object') {
    rawReceipt = { ...(result.data as Record<string, unknown>) };
  } else if (owner.id) {
    // Fallback directly to tables if RPC is unavailable or returns an error
    const payResult = await supabase
      .from('payments')
      .select('amount_paise, currency, receipt_no, paid_at, razorpay_payment_id, razorpay_handler, razorpay_mode, status')
      .eq('player_id', owner.id)
      .eq('status', 'verified')
      .not('receipt_no', 'is', null)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (payResult?.data?.receipt_no) {
      const p = payResult.data;
      rawReceipt = {
        registration_no: owner.registration_no,
        full_name: owner.full_name,
        locality: owner.locality,
        role: owner.role,
        photo_path: owner.photo_path,
        amount_paise: p.amount_paise,
        currency: p.currency,
        receipt_no: p.receipt_no,
        paid_at: p.paid_at,
        razorpay_payment_id: p.razorpay_payment_id,
        razorpay_handler: p.razorpay_handler,
        razorpay_mode: p.razorpay_mode,
        status: p.status,
        submitted_at: owner.created_at,
      };
    }
  }

  if (!rawReceipt || !rawReceipt.receipt_no) return { ok: false };

  // Resolve photo_url to a working full public/signed URL
  const photoPath = (rawReceipt.photo_path || rawReceipt.photo_url || owner.photo_path) as string | undefined;
  let photoUrl: string | null =
    typeof rawReceipt.photo_url === 'string' && rawReceipt.photo_url.startsWith('http')
      ? rawReceipt.photo_url
      : null;

  if (!photoUrl && photoPath) {
    const trimmed = photoPath.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      photoUrl = trimmed;
    } else if (typeof supabase.storage?.from === 'function') {
      try {
        const pub = supabase.storage.from('player-photos').getPublicUrl(trimmed);
        if (pub?.data?.publicUrl) {
          photoUrl = pub.data.publicUrl;
        }
      } catch {
        photoUrl = null;
      }
    }
  }

  return { ok: true, receipt: { ...rawReceipt, photo_url: photoUrl } };
}
