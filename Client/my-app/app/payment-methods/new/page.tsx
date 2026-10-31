import Link from 'next/link';
import {Button} from '@/components/ui/button';
export default function NewPaymentMethodPage() {
  return <main className="container mx-auto max-w-2xl space-y-4 p-6"><h1 className="text-2xl">Card payments</h1><p>You can enter your card securely in Stripe Checkout when paying for an order. Adding a saved card separately is currently unavailable.</p><Button asChild><Link href="/payment-methods">Back to payment methods</Link></Button></main>;
}
