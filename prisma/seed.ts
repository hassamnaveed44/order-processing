import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for PostgreSQL orderprocessing...');

  // Clean existing data for a fresh seed state
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // Create test Users
  const user1 = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'john.doe@example.com',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
    },
  });

  console.log(`✅ Seeded Users: ${user1.name} (${user1.id}), ${user2.name} (${user2.id})`);

  // Create test Products
  const product1 = await prisma.product.create({
    data: {
      name: 'Wireless Noise-Canceling Headphones',
      price: 199.99,
      stock: 50,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Mechanical RGB Keyboard',
      price: 129.50,
      stock: 100,
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Ergonomic Wireless Mouse',
      price: 49.99,
      stock: 75,
    },
  });

  const product4 = await prisma.product.create({
    data: {
      name: '32-inch 4K UHD Monitor',
      price: 449.00,
      stock: 30,
    },
  });

  console.log(`✅ Seeded 4 Products: ${product1.name}, ${product2.name}, ${product3.name}, ${product4.name}`);

  // Create an initial sample Order for testing GET /api/orders
  const sampleOrder = await prisma.order.create({
    data: {
      userId: user1.id,
      status: 'COMPLETED',
      total: 329.49,
      orderItems: {
        create: [
          { productId: product1.id, quantity: 1, price: 199.99 },
          { productId: product2.id, quantity: 1, price: 129.50 },
        ],
      },
    },
  });

  console.log(`✅ Seeded Initial Sample Order (${sampleOrder.id}) for ${user1.name}`);
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
