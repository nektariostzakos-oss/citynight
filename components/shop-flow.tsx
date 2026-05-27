'use client';

// Phase I.6c — public shop flow for sites that have products.
// Single multi-step wizard: catalog → cart → details → pay → confirm.
// Stripe Elements is loaded lazily (only at the 'pay' step) so the
// initial bundle stays small.

import { useEffect, useMemo, useState, useTransition } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

type Product = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  shortDesc: string | null;
  longDesc: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  stock: number | null;
  featured: boolean;
};

type CartLine = { product: Product; quantity: number };
type Step = 'catalog' | 'cart' | 'details' | 'pay' | 'confirm';

type Props = {
  siteId: string;
  siteName: string;
  initialProducts: Product[];
  locale: string;
  publishableKey: string | null;
};

function formatMoney(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(cents / 100);
}

let _stripe: Promise<Stripe | null> | null = null;
function getStripe(key: string) {
  if (!_stripe) _stripe = loadStripe(key);
  return _stripe;
}

export function ShopFlow({ siteId, siteName, initialProducts, locale, publishableKey }: Props) {
  const [step, setStep] = useState<Step>('catalog');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountCents: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [country, setCountry] = useState('GR');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState<{ id: string; totalCents: number; currency: string } | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const currency = initialProducts[0]?.currency ?? 'EUR';

  const subtotalCents = useMemo(
    () => cart.reduce((s, l) => s + l.product.priceCents * l.quantity, 0),
    [cart],
  );
  const discountCents = appliedCoupon?.discountCents ?? 0;
  const totalCents = Math.max(0, subtotalCents - discountCents);
  const itemCount = cart.reduce((s, l) => s + l.quantity, 0);

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing) {
        if (p.stock !== null && existing.quantity + 1 > p.stock) return prev;
        return prev.map((l) => l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l);
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  }
  function setQty(productId: string, qty: number) {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((l) => l.product.id !== productId);
      return prev.map((l) => {
        if (l.product.id !== productId) return l;
        const max = l.product.stock ?? 99;
        return { ...l, quantity: Math.min(max, qty) };
      });
    });
  }

  async function checkCoupon() {
    setCouponError(null);
    if (!couponCode.trim()) return;
    const res = await fetch(`/api/sites/${siteId}/shop/coupon`, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode.trim(), subtotalCents }),
    });
    const json = await res.json() as { ok?: boolean; reason?: string; discountCents?: number };
    if (!json.ok) {
      setCouponError(json.reason ?? 'invalid');
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discountCents: json.discountCents ?? 0 });
  }

  function submitOrder() {
    if (!cart.length || !name) return;
    if (!email && !phone) { setError('We need an email or phone.'); return; }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/sites/${siteId}/shop/order`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          customerName: name,
          customerEmail: email || undefined,
          customerPhone: phone || undefined,
          shippingAddress: address || undefined,
          shippingCity: city || undefined,
          shippingPostal: postal || undefined,
          shippingCountry: country || undefined,
          notes: notes || undefined,
          couponCode: appliedCoupon?.code || undefined,
          lang: locale,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? 'order_failed');
        return;
      }
      const { order: created } = (await res.json()) as { order: { id: string; totalCents: number; currency: string } };
      setOrder({ id: created.id, totalCents: created.totalCents, currency: created.currency });

      // Mint the PaymentIntent on the connected account
      const payRes = await fetch(`/api/sites/${siteId}/shop/order/${created.id}/pay`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!payRes.ok) {
        const j = await payRes.json().catch(() => ({}));
        setError(j.error ?? 'payment_init_failed');
        return;
      }
      const { clientSecret: cs } = (await payRes.json()) as { clientSecret: string };
      setClientSecret(cs);
      setStep('pay');
    });
  }

  // ─── render ───────────────────────────────────────────────────────

  if (step === 'confirm' && order) {
    return (
      <div className="site-panel p-8">
        <h2 className="site-h2 mb-3">Order placed.</h2>
        <p className="site-body mb-6">{siteName} will be in touch with shipping details.</p>
        <p className="text-sm" style={{ color: 'var(--site-muted)' }}>Reference: {order.id}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ShopSteps current={step} itemCount={itemCount} onShowCart={() => setStep('cart')} />

      {error && (
        <div className="rounded border border-red-400/40 bg-red-50/10 p-4 text-sm" style={{ color: 'var(--site-fg)' }}>
          {error}
        </div>
      )}

      {step === 'catalog' && (
        <section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {initialProducts.map((p) => (
              <article key={p.id} className="site-panel overflow-hidden p-0">
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="aspect-square w-full object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="site-display text-lg font-semibold" style={{ color: 'var(--site-fg)' }}>{p.name}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--site-primary)' }}>{formatMoney(p.priceCents, p.currency, locale)}</span>
                  </div>
                  {p.category && <div className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>{p.category}</div>}
                  {p.shortDesc && <p className="mt-3 site-body text-sm">{p.shortDesc}</p>}
                  <button
                    type="button"
                    onClick={() => addToCart(p)}
                    disabled={p.stock === 0}
                    className="site-cta mt-5 w-full disabled:opacity-50"
                  >
                    {p.stock === 0 ? 'Sold out' : 'Add to cart'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {step === 'cart' && (
        <section>
          <BackLink onClick={() => setStep('catalog')} label="← Keep shopping" />
          <h2 className="site-h2 mb-6">Your cart</h2>
          {cart.length === 0 ? (
            <p className="site-body">Your cart is empty.</p>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map((l) => (
                  <div key={l.product.id} className="site-panel flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold" style={{ color: 'var(--site-fg)' }}>{l.product.name}</div>
                      <div className="text-xs" style={{ color: 'var(--site-muted)' }}>{formatMoney(l.product.priceCents, l.product.currency, locale)} each</div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <button type="button" onClick={() => setQty(l.product.id, l.quantity - 1)} className="rounded border border-[var(--site-muted)]/30 px-2 py-1">−</button>
                      <span className="w-8 text-center">{l.quantity}</span>
                      <button type="button" onClick={() => setQty(l.product.id, l.quantity + 1)} className="rounded border border-[var(--site-muted)]/30 px-2 py-1">+</button>
                    </div>
                    <div className="w-20 text-right text-sm font-semibold" style={{ color: 'var(--site-fg)' }}>{formatMoney(l.product.priceCents * l.quantity, l.product.currency, locale)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 site-panel space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <input
                    type="text" placeholder="Discount code" maxLength={40}
                    value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                    className="site-panel flex-1 p-2 text-sm" style={{ color: 'var(--site-fg)' }}
                  />
                  <button type="button" onClick={checkCoupon} className="rounded border border-[var(--site-muted)]/30 px-3 py-2 text-sm">Apply</button>
                </div>
                {couponError && <p className="text-xs text-red-400">Code is {couponError.replace('_', ' ')}.</p>}
                {appliedCoupon && <p className="text-xs" style={{ color: 'var(--site-primary)' }}>Applied: −{formatMoney(appliedCoupon.discountCents, currency, locale)} ({appliedCoupon.code})</p>}
                <div className="flex items-center justify-between border-t border-[var(--site-muted)]/20 pt-3 text-sm">
                  <span style={{ color: 'var(--site-muted)' }}>Subtotal</span>
                  <span style={{ color: 'var(--site-fg)' }}>{formatMoney(subtotalCents, currency, locale)}</span>
                </div>
                {discountCents > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--site-muted)' }}>Discount</span>
                    <span style={{ color: 'var(--site-primary)' }}>−{formatMoney(discountCents, currency, locale)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-base font-semibold">
                  <span style={{ color: 'var(--site-fg)' }}>Total</span>
                  <span style={{ color: 'var(--site-fg)' }}>{formatMoney(totalCents, currency, locale)}</span>
                </div>
              </div>

              <button type="button" onClick={() => setStep('details')} className="site-cta mt-6 self-start">
                Continue to details →
              </button>
            </>
          )}
        </section>
      )}

      {step === 'details' && (
        <section>
          <BackLink onClick={() => setStep('cart')} label="← Back to cart" />
          <h2 className="site-h2 mb-6">Your details</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); submitOrder(); }}
            className="grid gap-4 max-w-xl"
          >
            <Field label="Full name" required>
              <input type="text" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
            </Field>
            <Field label="Email">
              <input type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
            </Field>
            <Field label="Phone">
              <input type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
            </Field>
            <Field label="Shipping address">
              <input type="text" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City">
                <input type="text" maxLength={100} value={city} onChange={(e) => setCity(e.target.value)} className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
              </Field>
              <Field label="Postal">
                <input type="text" maxLength={20} value={postal} onChange={(e) => setPostal(e.target.value)} className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
              </Field>
              <Field label="Country">
                <input type="text" maxLength={2} value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
              </Field>
            </div>
            <Field label="Notes (optional)">
              <textarea maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
            </Field>
            <button type="submit" disabled={pending} className="site-cta mt-2 self-start">
              {pending ? 'Preparing payment…' : `Continue to payment · ${formatMoney(totalCents, currency, locale)}`}
            </button>
          </form>
        </section>
      )}

      {step === 'pay' && clientSecret && order && publishableKey && (
        <section>
          <BackLink onClick={() => setStep('details')} label="← Edit details" />
          <h2 className="site-h2 mb-6">Payment</h2>
          <Elements stripe={getStripe(publishableKey)} options={{ clientSecret, appearance: { theme: 'night' } }}>
            <PayStep
              onSuccess={() => setStep('confirm')}
              onError={(msg) => setError(msg)}
              totalLabel={formatMoney(order.totalCents, order.currency, locale)}
            />
          </Elements>
        </section>
      )}

      {step === 'pay' && !publishableKey && (
        <p className="text-sm text-red-400">Stripe key not configured.</p>
      )}
    </div>
  );
}

function PayStep({ onSuccess, onError, totalLabel }: { onSuccess: () => void; onError: (msg: string) => void; totalLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: window.location.href },
    });
    setSubmitting(false);
    if (confirmError) {
      onError(confirmError.message ?? 'payment_failed');
      return;
    }
    onSuccess();
  }

  // Mount-effect: re-throw any unhandled error from useStripe init
  useEffect(() => () => undefined, []);

  return (
    <div className="space-y-4">
      <PaymentElement />
      <button type="button" onClick={confirm} disabled={!stripe || submitting} className="site-cta">
        {submitting ? 'Processing…' : `Pay ${totalLabel}`}
      </button>
    </div>
  );
}

function ShopSteps({ current, itemCount, onShowCart }: { current: Step; itemCount: number; onShowCart: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--site-muted)' }}>
      <span>Step {(['catalog', 'cart', 'details', 'pay'].indexOf(current) + 1)} of 4</span>
      <button type="button" onClick={onShowCart} className="rounded-full border border-[var(--site-muted)]/30 px-3 py-1">
        Cart · {itemCount}
      </button>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm mb-2" style={{ color: 'var(--site-muted)' }}>{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="mb-4 text-sm" style={{ color: 'var(--site-muted)' }}>
      <button type="button" onClick={onClick} className="underline-offset-2 hover:underline">{label}</button>
    </div>
  );
}
