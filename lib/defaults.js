/** Shared default menu + staff (SQLite seed, Vercel Postgres seed, client fallback). */
exports.DEFAULT_MENU = [
  { section: 'Main Meals', items: [
    { name: 'Fish N Chips', price: 160, desc: 'Crispy battered fish with seasoned fries.' },
    { name: 'Banger Mash', price: 140, desc: 'Juicy sausage over creamy mash with gravy.' },
    { name: 'Patty Melt', price: 150, desc: 'Grilled beef, melted cheese, toasted bread.' },
    { name: 'Mexican Taco', price: 125, desc: 'Seasoned meat with fresh, zesty toppings.' },
    { name: 'Spicy Wings', price: 155, desc: 'Saucy wings with a bold, spicy kick.' },
  ]},
  { section: 'Desserts', items: [
    { name: 'New York Cheesecake', price: 135, desc: 'Smooth, rich cheesecake with buttery crust.' },
    { name: 'Sticky Toffee Pudding', price: 130, desc: 'Warm cake topped with sweet toffee sauce.' },
  ]},
  { section: 'Sides', items: [
    { name: 'Mozzarella Sticks', price: 130, desc: 'Crispy outside, gooey melted cheese inside.' },
    { name: 'Fried Pickles', price: 135, desc: 'Tangy pickles fried to golden perfection.' },
    { name: 'Onion Rings', price: 125, desc: 'Thick-cut onions, crispy and golden.' },
    { name: 'Creamy Mac N Cheese', price: 130, desc: 'Rich, cheesy macaroni comfort classic.' },
    { name: 'Sausage Roll', price: 130, desc: 'Flaky pastry stuffed with savory sausage.' },
  ]},
  { section: 'Bottled Beer', items: [
    { name: 'Stella Artois', price: 160, desc: 'Crisp lager with a smooth finish.' },
    { name: 'Miller Lite', price: 140, desc: 'Light beer, easy and refreshing.' },
    { name: 'Coors Lite', price: 130, desc: 'Clean, cold lager with smooth taste.' },
    { name: 'Heineken', price: 165, desc: 'Balanced lager with slight bitterness.' },
    { name: 'Guinness', price: 170, desc: 'Dark stout with creamy, roasted flavor.' },
    { name: 'Modelo Especial', price: 155, desc: 'Smooth lager with rich, full flavor.' },
  ]},
  { section: 'Cocktails', items: [
    { name: 'Long Island Iced Tea', price: 320, desc: 'Strong mix of spirits with citrus.' },
    { name: 'Shirley Temple', price: 200, desc: 'Sweet, fizzy drink with cherry flavor.' },
  ]},
  { section: 'Quick Hits', items: [
    { name: 'Jägerbomb', price: 300, desc: 'Energy drink mixed with herbal liqueur.' },
    { name: 'Lemon Drop Shot', price: 260, desc: 'Sweet, tart citrus vodka shot.' },
    { name: 'Fireball Shot', price: 240, desc: 'Cinnamon whiskey with a fiery kick.' },
    { name: 'Jose Cuervo Shot', price: 250, desc: 'Classic smooth tequila shot.' },
    { name: "Tito's Vodka Shot", price: 275, desc: 'Clean, crisp vodka with smooth finish.' },
  ]},
  { section: 'Top Shelf', items: [
    { name: 'Whiskey', price: 400, desc: 'Premium pour, bold and smooth.' },
  ]},
  { section: 'Block Budz', items: [
    { name: 'Joint', price: 1300, desc: 'Premium joint — see staff for availability.', partner: 'budz' },
    { name: 'Lighter', price: 300, desc: 'Complimentary lighter to go with your purchase.', partner: 'budz' },
  ]},
  { section: 'Sweet Requiem', items: [
    { name: 'Cake', price: 450, desc: 'Signature Sweet Requiem cake slice.', partner: 'requiem' },
    { name: 'Signature Drink', price: 300, desc: 'House-crafted Sweet Requiem beverage.', partner: 'requiem' },
    { name: 'Dessert Platter', price: 700, desc: 'Assorted premium sweets platter.', partner: 'requiem' },
  ]},
];

exports.DEFAULT_USERS = [
  { name: 'Admin', role: 'admin', pin: '0000' },
];
