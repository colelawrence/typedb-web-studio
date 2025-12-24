/**
 * E-Commerce Demo
 *
 * An e-commerce schema demonstrating:
 * - Entity types: customer, product, order, category
 * - Relation types: purchase, contains, categorization, review
 * - Attribute types: price, quantity, rating, status
 */

import type { DemoDefinition } from "./index";

export const ECOMMERCE_DEMO: DemoDefinition = {
  id: "e-commerce",
  name: "E-Commerce",
  description: "Product catalog with categories, orders, and customer data",
  icon: "shopping-cart",

  schema: `
# E-Commerce Schema
# Product catalog, orders, and customer management

# =============================================================================
# Attribute Types
# =============================================================================

define

# Identity attributes
attribute name value string;
attribute email value string;
attribute sku value string;
attribute order-number value string;

# Descriptive attributes
attribute description value string;
attribute brand value string;
attribute address value string;

# Numeric attributes
attribute price value double;
attribute quantity value integer;
attribute rating value double;
attribute stock-level value integer;
attribute total-amount value double;

# Status attributes
attribute status value string;

# Date attributes
attribute created-at value datetime;
attribute updated-at value datetime;
attribute shipped-at value datetime;

# =============================================================================
# Entity Types
# =============================================================================

# A customer who shops on the platform
entity customer,
    owns name,
    owns email @unique,
    owns address,
    owns created-at,
    plays purchase:buyer,
    plays review:reviewer,
    plays wishlist:wisher;

# A product available for purchase
entity product,
    owns name,
    owns sku @unique,
    owns description,
    owns brand,
    owns price,
    owns stock-level,
    owns created-at,
    plays order-item:item,
    plays categorization:product,
    plays review:reviewed,
    plays wishlist:wished,
    plays recommendation:source,
    plays recommendation:suggested;

# A product category
entity category,
    owns name,
    owns description,
    plays categorization:category,
    plays category-hierarchy:parent,
    plays category-hierarchy:child;

# An order placed by a customer
entity order,
    owns order-number @unique,
    owns total-amount,
    owns status,
    owns created-at,
    owns updated-at,
    owns shipped-at,
    plays purchase:order,
    plays order-item:order;

# =============================================================================
# Relation Types
# =============================================================================

# A customer places an order
relation purchase,
    relates buyer,
    relates order;

# Products in an order with quantities
relation order-item,
    owns quantity,
    owns price,
    relates order,
    relates item;

# Product belongs to category
relation categorization,
    relates product,
    relates category;

# Category hierarchy (parent-child)
relation category-hierarchy,
    relates parent,
    relates child;

# Customer reviews a product
relation review,
    owns rating,
    owns description,
    owns created-at,
    relates reviewer,
    relates reviewed;

# Customer's wishlist
relation wishlist,
    owns created-at,
    relates wisher,
    relates wished;

# Product recommendations
relation recommendation,
    owns rating,
    relates source,
    relates suggested;
`,

  sampleData: `
# =============================================================================
# Categories
# =============================================================================
insert $electronics isa category, has name "Electronics", has description "Electronic devices and accessories";

insert $computers isa category, has name "Computers", has description "Desktop and laptop computers";

insert $phones isa category, has name "Phones", has description "Smartphones and mobile devices";

insert $clothing isa category, has name "Clothing", has description "Apparel and fashion";

insert $books isa category, has name "Books", has description "Physical and digital books";

# =============================================================================
# Category Hierarchy (using match-insert)
# =============================================================================
match $electronics isa category, has name "Electronics"; $computers isa category, has name "Computers"; insert (parent: $electronics, child: $computers) isa category-hierarchy;

match $electronics isa category, has name "Electronics"; $phones isa category, has name "Phones"; insert (parent: $electronics, child: $phones) isa category-hierarchy;

# =============================================================================
# Products
# =============================================================================
insert $laptop1 isa product, has name "Pro Laptop 15", has sku "LAPTOP-001", has description "15-inch professional laptop with M3 chip", has brand "TechBrand", has price 1999.99, has stock-level 50, has created-at 2023-01-15T10:00:00;

insert $laptop2 isa product, has name "Budget Laptop 14", has sku "LAPTOP-002", has description "Affordable 14-inch laptop for everyday use", has brand "ValueTech", has price 699.99, has stock-level 120, has created-at 2023-02-20T10:00:00;

insert $phone1 isa product, has name "SmartPhone Pro", has sku "PHONE-001", has description "Flagship smartphone with advanced camera", has brand "TechBrand", has price 1199.99, has stock-level 200, has created-at 2023-03-10T10:00:00;

insert $shirt1 isa product, has name "Classic Cotton Shirt", has sku "SHIRT-001", has description "Premium cotton shirt in multiple colors", has brand "FashionCo", has price 49.99, has stock-level 500, has created-at 2023-04-01T10:00:00;

insert $book1 isa product, has name "Learning TypeDB", has sku "BOOK-001", has description "Comprehensive guide to TypeDB and TypeQL", has brand "TechBooks", has price 39.99, has stock-level 1000, has created-at 2023-05-01T10:00:00;

# =============================================================================
# Product Categorization (using match-insert)
# =============================================================================
match $laptop1 isa product, has sku "LAPTOP-001"; $computers isa category, has name "Computers"; insert (product: $laptop1, category: $computers) isa categorization;

match $laptop2 isa product, has sku "LAPTOP-002"; $computers isa category, has name "Computers"; insert (product: $laptop2, category: $computers) isa categorization;

match $phone1 isa product, has sku "PHONE-001"; $phones isa category, has name "Phones"; insert (product: $phone1, category: $phones) isa categorization;

match $shirt1 isa product, has sku "SHIRT-001"; $clothing isa category, has name "Clothing"; insert (product: $shirt1, category: $clothing) isa categorization;

match $book1 isa product, has sku "BOOK-001"; $books isa category, has name "Books"; insert (product: $book1, category: $books) isa categorization;

# =============================================================================
# Customers
# =============================================================================
insert $john isa customer, has name "John Doe", has email "john.doe@email.com", has address "123 Main St, New York, NY 10001", has created-at 2023-01-01T10:00:00;

insert $jane isa customer, has name "Jane Smith", has email "jane.smith@email.com", has address "456 Oak Ave, Los Angeles, CA 90001", has created-at 2023-01-15T10:00:00;

insert $mike isa customer, has name "Mike Johnson", has email "mike.j@email.com", has address "789 Pine Rd, Chicago, IL 60601", has created-at 2023-02-01T10:00:00;

# =============================================================================
# Orders
# =============================================================================
insert $order1 isa order, has order-number "ORD-2023-001", has total-amount 2049.98, has status "delivered", has created-at 2023-06-01T14:30:00, has shipped-at 2023-06-03T10:00:00;

insert $order2 isa order, has order-number "ORD-2023-002", has total-amount 1249.98, has status "delivered", has created-at 2023-06-15T11:00:00, has shipped-at 2023-06-17T10:00:00;

# =============================================================================
# Purchases (using match-insert)
# =============================================================================
match $john isa customer, has email "john.doe@email.com"; $order1 isa order, has order-number "ORD-2023-001"; insert (buyer: $john, order: $order1) isa purchase;

match $jane isa customer, has email "jane.smith@email.com"; $order2 isa order, has order-number "ORD-2023-002"; insert (buyer: $jane, order: $order2) isa purchase;

# =============================================================================
# Order Items (using match-insert)
# =============================================================================
match $order1 isa order, has order-number "ORD-2023-001"; $laptop1 isa product, has sku "LAPTOP-001"; insert (order: $order1, item: $laptop1) isa order-item, has quantity 1, has price 1999.99;

match $order2 isa order, has order-number "ORD-2023-002"; $phone1 isa product, has sku "PHONE-001"; insert (order: $order2, item: $phone1) isa order-item, has quantity 1, has price 1199.99;

# =============================================================================
# Reviews (using match-insert)
# =============================================================================
match $john isa customer, has email "john.doe@email.com"; $laptop1 isa product, has sku "LAPTOP-001"; insert (reviewer: $john, reviewed: $laptop1) isa review, has rating 4.5, has description "Excellent laptop, very fast and reliable", has created-at 2023-06-10T10:00:00;

match $jane isa customer, has email "jane.smith@email.com"; $phone1 isa product, has sku "PHONE-001"; insert (reviewer: $jane, reviewed: $phone1) isa review, has rating 5.0, has description "Best phone I have ever owned!", has created-at 2023-06-25T14:00:00;

# =============================================================================
# Recommendations (using match-insert)
# =============================================================================
match $laptop1 isa product, has sku "LAPTOP-001"; $phone1 isa product, has sku "PHONE-001"; insert (source: $laptop1, suggested: $phone1) isa recommendation, has rating 0.85;

match $laptop1 isa product, has sku "LAPTOP-001"; $book1 isa product, has sku "BOOK-001"; insert (source: $laptop1, suggested: $book1) isa recommendation, has rating 0.72;
`,

  exampleQueries: [
    {
      name: "All Products",
      description: "List all products with prices",
      query: `match $p isa product;
fetch {
    "name": $p.name,
    "brand": $p.brand,
    "price": $p.price,
    "stock": $p.stock-level
};`,
    },
    {
      name: "Products by Category",
      description: "Find products in Electronics",
      query: `match
$cat isa category, has name "Electronics";
(parent: $cat, child: $subcat) isa category-hierarchy;
(product: $prod, category: $subcat) isa categorization;
fetch {
    "category": $subcat.name,
    "product": $prod.name,
    "price": $prod.price
};`,
    },
    {
      name: "Customer Orders",
      description: "Show orders with customer and total",
      query: `match
(buyer: $customer, order: $order) isa purchase;
fetch {
    "customer": $customer.name,
    "order": $order.order-number,
    "total": $order.total-amount,
    "status": $order.status
};`,
    },
    {
      name: "Order Details",
      description: "Full order breakdown with items",
      query: `match
$order isa order, has order-number "ORD-2023-001";
(order: $order, item: $product) isa order-item, has quantity $qty, has price $price;
fetch {
    "product": $product.name,
    "quantity": $qty,
    "price": $price
};`,
    },
    {
      name: "Top Reviewed Products",
      description: "Products with highest ratings",
      query: `match
(reviewer: $customer, reviewed: $product) isa review, has rating $rating;
$rating >= 4.5;
fetch {
    "product": $product.name,
    "reviewer": $customer.name,
    "rating": $rating
};`,
    },
    {
      name: "Recommended Products",
      description: "Product recommendations based on purchases",
      query: `match
(source: $bought, suggested: $recommended) isa recommendation, has rating $score;
fetch {
    "if_you_bought": $bought.name,
    "you_might_like": $recommended.name,
    "relevance": $score
};`,
    },
  ],
};
