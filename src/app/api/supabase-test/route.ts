/**
 * Simple Database Connection Test API
 * 
 * This endpoint tests the connection to the Supabase database
 * with a simpler approach to avoid schema issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Testing Supabase database connection...');

    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test each table with simple queries
    const tests = {
      users: await prisma.user.count(),
      stores: await prisma.store.count(),
      banks: await prisma.bank.count(),
      vendors: await prisma.vendor.count(),
      checks: await prisma.check.count(),
    };

    console.log('📊 Table counts:', tests);

    // Test creating a test store if none exist
    let testStore;
    if (tests.stores === 0) {
      console.log('🏪 Creating test store...');
      testStore = await prisma.store.create({
        data: {
          name: 'Test Store',
          address: '123 Test Street, Test City, TC 12345',
          phone: '555-123-4567',
        },
      });
      console.log('✅ Test store created:', testStore.id);
    } else {
      testStore = await prisma.store.findFirst();
      console.log('✅ Store already exists:', testStore?.id);
    }

    // Test creating a test user if none exist
    let testUser;
    if (tests.users === 0) {
      console.log('👤 Creating test admin user...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      testUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@qt-office.com',
          passwordHash: hashedPassword,
          role: 'ADMIN' as any,
          storeId: testStore?.id || 'test-store-id',
        },
      });
      console.log('✅ Test admin user created:', testUser.id);
    } else {
      testUser = await prisma.user.findFirst();
      console.log('✅ User already exists:', testUser?.id);
    }

    // Test creating a test bank if none exist
    let testBank;
    if (tests.banks === 0) {
      console.log('🏦 Creating test bank...');
      testBank = await prisma.bank.create({
        data: {
          bankName: 'Test Bank',
          accountNumber: '1234567890',
          routingNumber: '123456789',
          storeId: testStore?.id || 'test-store-id',
          balance: 10000.00,
        },
      });
      console.log('✅ Test bank created:', testBank.id);
    } else {
      testBank = await prisma.bank.findFirst();
      console.log('✅ Bank already exists:', testBank?.id);
    }

    // Test creating a test vendor if none exist
    let testVendor;
    if (tests.vendors === 0) {
      console.log('👥 Creating test vendor...');
      testVendor = await prisma.vendor.create({
        data: {
          vendorName: 'Test Vendor',
          vendorType: 'MERCHANDISE' as any,
          description: 'Test vendor for system testing',
          contact: '{"email": "vendor@test.com", "phone": "555-987-6543"}',
          storeId: testStore?.id || 'test-store-id',
        },
      });
      console.log('✅ Test vendor created:', testVendor.id);
    } else {
      testVendor = await prisma.vendor.findFirst();
      console.log('✅ Vendor already exists:', testVendor?.id);
    }

    // Get updated counts
    const updatedTests = {
      users: await prisma.user.count(),
      stores: await prisma.store.count(),
      banks: await prisma.bank.count(),
      vendors: await prisma.vendor.count(),
      checks: await prisma.check.count(),
    };

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: 'Supabase database connection successful!',
      database: {
        provider: 'Supabase',
        host: 'db.uznzmoulrdzyfpshnixx.supabase.co',
        port: 5432,
        database: 'postgres',
      },
      initialCounts: tests,
      updatedCounts: updatedTests,
      createdEntities: {
        store: testStore ? { id: testStore.id, name: testStore.name } : null,
        user: testUser ? { id: testUser.id, username: testUser.username, role: testUser.role } : null,
        bank: testBank ? { id: testBank.id, bankName: testBank.bankName, balance: testBank.balance } : null,
        vendor: testVendor ? { id: testVendor.id, vendorName: testVendor.vendorName, vendorType: testVendor.vendorType } : null,
      },
      tests: {
        connection: '✅ Success',
        tables: '✅ All tables accessible',
        storeCreation: tests.stores === 0 ? '✅ Test store created' : '✅ Store already exists',
        userCreation: tests.users === 0 ? '✅ Test admin user created' : '✅ Users already exist',
        bankCreation: tests.banks === 0 ? '✅ Test bank created' : '✅ Banks already exist',
        vendorCreation: tests.vendors === 0 ? '✅ Test vendor created' : '✅ Vendors already exist',
      },
    });

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        database: {
          provider: 'Supabase',
          host: 'db.uznzmoulrdzyfpshnixx.supabase.co',
          port: 5432,
          database: 'postgres',
        },
      },
      { status: 500 }
    );
  }
}