import type { Product } from '@/lib/types';

function DetailValue({value}: {value: unknown}) {
  if (value == null || value === '') return null;
  if (Array.isArray(value)) return <span>{value.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ')}</span>;
  if (typeof value === 'object') return <dl className="space-y-2">{Object.entries(value).map(([key, entry]) => <div key={key}><dt className="text-muted-foreground capitalize">{key.replaceAll('_', ' ')}</dt><dd><DetailValue value={entry} /></dd></div>)}</dl>;
  return <span>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>;
}
export function ProductExtraDetails({product}: {product: Product}) {
  const fields = product.gameDetails ? ['genre','platform','developer','publisher','release_date','age_rating','multiplayer','system_requirements','languages','edition']
    : ['cpu','gpu','motherboard','ram','storage','power_supply','pc_case','cooling_system','operating_system','warranty_period'];
  const details = product.gameDetails || product.pcDetails;
  if (!details) return null;
  return <section className="space-y-4"><h2 className="text-xl font-semibold">{product.gameDetails ? 'Game details' : 'PC configuration'}</h2>
    <dl className="grid gap-4 sm:grid-cols-2">{fields.filter(key => details[key] != null).map(key => <div key={key} className="min-w-0 break-words rounded border p-3"><dt className="font-medium capitalize">{key.replaceAll('_',' ')}</dt><dd className="mt-2 text-sm"><DetailValue value={details[key]} /></dd></div>)}</dl>
  </section>;
}
