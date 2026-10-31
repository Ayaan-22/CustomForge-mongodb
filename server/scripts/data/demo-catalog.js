// Fictional storefront fixtures. Prices are sample USD amounts, not market quotes.
// Existing category illustrations are representative, not model photographs.
const groups = [
  ['CPU', '/processor-cpu-chip.jpg', [
    ['Ember C6 Processor', 159, { cores: '6', threads: '12', socket: 'AM5', power: '65 W' }],
    ['Ember C8 Processor', 249, { cores: '8', threads: '16', socket: 'AM5', power: '105 W' }],
    ['Ember C12 Creator Processor', 379, { cores: '12', threads: '24', socket: 'AM5', power: '120 W' }],
    ['Ember C16 Studio Processor', 529, { cores: '16', threads: '32', socket: 'AM5', power: '170 W' }],
  ]],
  ['GPU', '/graphics-card-gpu.jpg', [
    ['Shadow G8 Graphics Card', 239, { memory: '8 GB', cooling: 'Dual fan', target_resolution: '1080p' }],
    ['Shadow G12 Graphics Card', 399, { memory: '12 GB', cooling: 'Dual fan', target_resolution: '1440p' }],
    ['Shadow G16 Graphics Card', 599, { memory: '16 GB', cooling: 'Triple fan', target_resolution: '1440p' }],
    ['Shadow G24 Studio Graphics Card', 899, { memory: '24 GB', cooling: 'Triple fan', target_resolution: '4K' }],
  ]],
  ['Motherboard', '/motherboard-asus-b650.jpg', [
    ['Nexus M Compact Motherboard', 119, { socket: 'AM5', form_factor: 'Micro ATX', memory: 'DDR5', slots: '2 DIMM' }],
    ['Nexus A WiFi Motherboard', 179, { socket: 'AM5', form_factor: 'ATX', memory: 'DDR5', networking: 'WiFi 6' }],
    ['Nexus I Mini Motherboard', 219, { socket: 'AM5', form_factor: 'Mini ITX', memory: 'DDR5', networking: '2.5 Gb Ethernet' }],
  ]],
  ['RAM', '/ram-g-skill-ddr5.jpg', [
    ['Blaze 16 GB Memory Kit', 49, { capacity: '16 GB (2 x 8 GB)', type: 'DDR5', speed: '5200 MT/s' }],
    ['Blaze 32 GB Memory Kit', 89, { capacity: '32 GB (2 x 16 GB)', type: 'DDR5', speed: '6000 MT/s' }],
    ['Blaze 64 GB Creator Memory Kit', 169, { capacity: '64 GB (2 x 32 GB)', type: 'DDR5', speed: '5600 MT/s' }],
  ]],
  ['Storage', '/ssd-nvme-storage.jpg', [
    ['Vertex 500 GB NVMe SSD', 39, { capacity: '500 GB', interface: 'PCIe 4.0 x4', form_factor: 'M.2 2280' }],
    ['Vertex 1 TB NVMe SSD', 69, { capacity: '1 TB', interface: 'PCIe 4.0 x4', form_factor: 'M.2 2280' }],
    ['Vertex 2 TB NVMe SSD', 119, { capacity: '2 TB', interface: 'PCIe 4.0 x4', form_factor: 'M.2 2280' }],
    ['Vertex 4 TB Archive SSD', 229, { capacity: '4 TB', interface: 'SATA III', form_factor: '2.5 inch' }],
  ]],
  ['Power Supply', '/psu-corsair-850w.jpg', [
    ['Thunder 550 W Power Supply', 59, { output: '550 W', form_factor: 'ATX', cabling: 'Fixed' }],
    ['Thunder 750 W Modular Power Supply', 99, { output: '750 W', form_factor: 'ATX', cabling: 'Fully modular' }],
    ['Thunder 1000 W Modular Power Supply', 159, { output: '1000 W', form_factor: 'ATX', cabling: 'Fully modular' }],
  ]],
  ['Cooler', '/cooler-nzxt-360.jpg', [
    ['Arctic 120 Liquid Cooler', 59, { radiator: '120 mm', fans: '1 x 120 mm', sockets: 'AM5 / LGA1700' }],
    ['Arctic 240 Liquid Cooler', 99, { radiator: '240 mm', fans: '2 x 120 mm', sockets: 'AM5 / LGA1700' }],
    ['Arctic 360 Liquid Cooler', 139, { radiator: '360 mm', fans: '3 x 120 mm', sockets: 'AM5 / LGA1700' }],
  ]],
  ['Case', '/case-nzxt-phantom.jpg', [
    ['Phantom Mini Airflow Case', 59, { form_factor: 'Micro ATX', panel: 'Mesh', included_fans: '2 x 120 mm' }],
    ['Phantom Mid Tower Case', 89, { form_factor: 'ATX', panel: 'Tempered glass', included_fans: '3 x 120 mm' }],
    ['Phantom Studio Full Tower Case', 139, { form_factor: 'E-ATX', panel: 'Tempered glass', included_fans: '4 x 140 mm' }],
  ]],
  ['Monitor', '/gaming-monitor.jpg', [
    ['Horizon 24 Gaming Monitor', 149, { size: '24 inch', resolution: '1920 x 1080', refresh_rate: '144 Hz', panel: 'IPS' }],
    ['Horizon 27 QHD Monitor', 269, { size: '27 inch', resolution: '2560 x 1440', refresh_rate: '165 Hz', panel: 'IPS' }],
    ['Horizon 32 Studio Monitor', 429, { size: '32 inch', resolution: '3840 x 2160', refresh_rate: '60 Hz', panel: 'IPS' }],
  ]],
  ['Keyboard', '/mechanical-keyboard.jpg', [
    ['Viper 60 Compact Keyboard', 49, { layout: '60%', switches: 'Linear mechanical', connection: 'USB-C' }],
    ['Viper TKL Gaming Keyboard', 79, { layout: 'Tenkeyless', switches: 'Tactile mechanical', connection: 'USB-C' }],
    ['Viper Full Wireless Keyboard', 109, { layout: 'Full size', switches: 'Linear mechanical', connection: 'USB / Bluetooth' }],
  ]],
  ['Mouse', '/mouse-logitech-striker.jpg', [
    ['Striker Core Gaming Mouse', 29, { sensor: 'Optical', buttons: '6', connection: 'USB wired', weight: '85 g' }],
    ['Striker Air Wireless Mouse', 59, { sensor: 'Optical', buttons: '6', connection: '2.4 GHz wireless', weight: '65 g' }],
    ['Striker Pro Wireless Mouse', 89, { sensor: 'Optical', buttons: '8', connection: 'USB / 2.4 GHz wireless', weight: '75 g' }],
  ]],
  ['Headset', '/gaming-headset.jpg', [
    ['Echo Core Gaming Headset', 39, { driver: '40 mm', connection: '3.5 mm', microphone: 'Adjustable boom' }],
    ['Echo Air Wireless Headset', 89, { driver: '50 mm', connection: '2.4 GHz wireless', microphone: 'Detachable boom' }],
  ]],
  ['Networking', '/gaming-component.jpg', [
    ['Link AX Wireless Adapter', 35, { interface: 'PCIe x1', wireless: 'WiFi 6', bands: '2.4 / 5 GHz' }],
    ['Link 2.5G Ethernet Adapter', 29, { interface: 'USB-C', ethernet: '2.5 Gb/s', ports: '1 x RJ45' }],
  ]],
];

export const demoProducts = groups.flatMap(([category, image, entries]) =>
  entries.map(([name, price, specifications], index) => ({
    name: `CustomForge ${name} (Demo)`,
    category,
    brand: 'CustomForge',
    sku: `CF-DEMO-${name.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
    original_price: price,
    discount_percentage: index === 1 ? 10 : 0,
    final_price: Number((price * (index === 1 ? 0.9 : 1)).toFixed(2)),
    stock: index === 3 ? 0 : 10 + index * 8,
    availability: index === 3 ? 'Out of Stock' : 'In Stock',
    images: [image],
    description: `${name} is a fictional ${category.toLowerCase()} listing for the CustomForge demo storefront. Specifications, USD price and inventory are sample data. The image is a representative category illustration, not a photograph of this model.`,
    specifications,
    features: Object.entries(specifications).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value}`),
    warranty: 'Demo listing; no actual warranty offer',
    ratings: { average: 0, totalReviews: 0 },
    sales_count: 0,
    is_active: true,
    is_featured: index === 1,
  }))
);
