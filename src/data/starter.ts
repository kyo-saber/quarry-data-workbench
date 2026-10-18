import type { SavedQuery } from '../types'

export const STARTER_SETUP_SQL = [
  `CREATE OR REPLACE TABLE products AS
   SELECT * FROM (VALUES
     (1, 'Aero Bottle', 'Hydration', 32.00),
     (2, 'Trail Mix', 'Snacks', 8.50),
     (3, 'Field Notes', 'Stationery', 14.00),
     (4, 'Camp Mug', 'Drinkware', 24.00),
     (5, 'Wool Socks', 'Apparel', 18.00),
     (6, 'Pocket Torch', 'Equipment', 39.00),
     (7, 'Canvas Tote', 'Bags', 28.00),
     (8, 'Granola Bar', 'Snacks', 4.50),
     (9, 'Rain Shell', 'Apparel', 96.00),
     (10, 'Desk Tray', 'Stationery', 21.00)
   ) AS t(product_id, product_name, category, unit_price)`,
  `CREATE OR REPLACE TABLE customers AS
   SELECT * FROM (VALUES
     (1, 'Maya Chen', 'Portland', 'Oregon', '2024-03-12'),
     (2, 'Theo Martin', 'Austin', 'Texas', '2024-05-08'),
     (3, 'Nora Patel', 'Brooklyn', 'New York', '2024-06-23'),
     (4, 'Eli Brooks', 'Denver', 'Colorado', '2024-08-19'),
     (5, 'Sofia Reyes', 'San Diego', 'California', '2024-09-04'),
     (6, 'Jon Bell', 'Seattle', 'Washington', '2024-10-27'),
     (7, 'Ari Kim', 'Chicago', 'Illinois', '2025-01-15'),
     (8, 'Lena Ortiz', 'Miami', 'Florida', '2025-02-02'),
     (9, 'Sam Wilson', 'Boston', 'Massachusetts', '2025-02-21'),
     (10, 'Iris Novak', 'Madison', 'Wisconsin', '2025-03-09'),
     (11, 'Noah Grant', 'Phoenix', 'Arizona', '2025-03-28'),
     (12, 'Zoe Clark', 'Nashville', 'Tennessee', '2025-04-11'),
     (13, 'Owen Price', 'Minneapolis', 'Minnesota', '2025-05-02'),
     (14, 'Leah Singh', 'Raleigh', 'North Carolina', '2025-05-20'),
     (15, 'Miles Reed', 'Oakland', 'California', '2025-06-06'),
     (16, 'June Park', 'Jersey City', 'New Jersey', '2025-06-24'),
     (17, 'Ben Hall', 'Salt Lake City', 'Utah', '2025-07-12'),
     (18, 'Cleo James', 'Richmond', 'Virginia', '2025-08-01'),
     (19, 'Ivan Cole', 'Boise', 'Idaho', '2025-08-18'),
     (20, 'Tess Lane', 'Savannah', 'Georgia', '2025-09-05')
   ) AS t(customer_id, customer_name, city, state, joined_at)`,
  `CREATE OR REPLACE TABLE orders AS
   SELECT
     CAST(i AS INTEGER) AS order_id,
     CAST(((i * 7) % 20) + 1 AS INTEGER) AS customer_id,
     CAST(((i * 7) % 10) + 1 AS INTEGER) AS product_id,
     DATE '2025-01-01' + CAST(((i * 29) % 365) AS INTEGER) AS order_date,
     CAST((i % 3) + 1 AS INTEGER) AS quantity,
     CASE WHEN i % 13 = 0 THEN 'cancelled' ELSE 'completed' END AS status,
     CASE (i % 4)
       WHEN 0 THEN 'Organic search'
       WHEN 1 THEN 'Paid social'
       WHEN 2 THEN 'Email'
       ELSE 'Partner'
     END AS channel
   FROM range(1, 129) AS t(i)`,
] as const

export const DEFAULT_QUERY = `-- Revenue pulse by month
SELECT
  date_trunc('month', o.order_date) AS month,
  round(sum(o.quantity * p.unit_price), 2) AS revenue,
  count(DISTINCT o.order_id) AS orders,
  round(avg(o.quantity * p.unit_price), 2) AS avg_order_value
FROM orders AS o
JOIN products AS p USING (product_id)
WHERE o.status = 'completed'
GROUP BY 1
ORDER BY 1`

const now = Date.now()

export const STARTER_QUERIES: SavedQuery[] = [
  {
    id: 'starter-revenue',
    name: 'Revenue pulse',
    sql: DEFAULT_QUERY,
    createdAt: now,
  },
  {
    id: 'starter-products',
    name: 'Top products',
    sql: `SELECT
  p.product_name,
  p.category,
  round(sum(o.quantity * p.unit_price), 2) AS revenue,
  sum(o.quantity) AS units_sold
FROM orders AS o
JOIN products AS p USING (product_id)
WHERE o.status = 'completed'
GROUP BY 1, 2
ORDER BY revenue DESC`,
    createdAt: now - 1,
  },
  {
    id: 'starter-channels',
    name: 'Channel mix',
    sql: `SELECT
  channel,
  count(*) AS completed_orders,
  round(sum(o.quantity * p.unit_price), 2) AS revenue
FROM orders AS o
JOIN products AS p USING (product_id)
WHERE o.status = 'completed'
GROUP BY 1
ORDER BY revenue DESC`,
    createdAt: now - 2,
  },
]

