/**
 * Updated Schema Test API
 * 
 * This endpoint tests the new improved Prisma schema
 * with proper field mappings and enums.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentMethod, CheckStatus, AccountType, Role, VendorType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Testing updated Prisma schema...');

    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test creating entities with new schema
    console.log('🏪 Creating test store with new schema...');
    const testStore = await prisma.store.create({
      data: {
        name: 'QT Office Main Store',
        address: '123 Business Street, City, State 12345',
        phone: '555-123-4567',
      },
    });
    console.log('✅ Test store created:', testStore.id);

    console.log('👤 Creating test admin user with new schema...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const testUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@qt-office.com',
        passwordHash: hashedPassword,
        role: Role.ADMIN,
        storeId: testStore.id,
        isActive: true,
      },
    });
    console.log('✅ Test admin user created:', testUser.id);

    console.log('🏦 Creating test bank with new schema...');
    const testBank = await prisma.bank.create({
      data: {
        bankName: 'First National Bank',
        accountNumber: '1234567890',
        routingNumber: '123456789',
        accountType: AccountType.CHECKING,
        storeId: testStore.id,
        balance: 50000.00,
        isActive: true,
      },
    });
    console.log('✅ Test bank created:', testBank.id);

    console.log('👥 Creating test vendor with new schema...');
    const testVendor = await prisma.vendor.create({
      data: {
        vendorName: 'ABC Office Supplies',
        vendorType: VendorType.MERCHANDISE,
        description: 'Office supplies and equipment',
        contactPerson: 'John Smith',
        email: 'john@abcoffice.com',
        phone: '555-987-6543',
        address: '456 Vendor Lane, City, State 54321',
        storeId: testStore.id,
        isActive: true,
      },
    });
    console.log('✅ Test vendor created:', testVendor.id);

    console.log('📝 Creating test check with new schema...');
    const testCheck = await prisma.check.create({
      data: {
        referenceNumber: '1001',
        paymentMethod: PaymentMethod.CHECK,
        bankId: testBank.id,
        vendorId: testVendor.id,
        payeeName: 'ABC Office Supplies',
        amount: 1500.00,
        memo: 'Office supplies payment',
        status: CheckStatus.ISSUED,
        issuedBy: testUser.id,
      },
    });
    console.log('✅ Test check created:', testCheck.id);

    console.log('📋 Creating check history...');
    const testHistory = await prisma.checkHistory.create({
      data: {
        checkId: testCheck.id,
        action: 'CREATED',
        status: CheckStatus.ISSUED,
        performedBy: testUser.id,
        changes: { amount: 1500.00, status: 'ISSUED' },
        reason: 'Initial check creation',
        ipAddress: '127.0.0.1',
      },
    });
    console.log('✅ Check history created:', testHistory.id);

    console.log('📊 Creating audit log...');
    const testAuditLog = await prisma.auditLog.create({
      data: {
        userId: testUser.id,
        action: 'CREATE_CHECK',
        entityType: 'Check',
        entityId: testCheck.id,
        oldValues: null,
        newValues: { referenceNumber: '1001', amount: 1500.00 },
        ipAddress: '127.0.0.1',
        userAgent: 'Schema Test',
      },
    });
    console.log('✅ Audit log created:', testAuditLog.id);

    // Get final counts
    const counts = {
      users: await prisma.user.count(),
      stores: await prisma.store.count(),
      banks: await prisma.bank.count(),
      vendors: await prisma.vendor.count(),
      checks: await prisma.check.count(),
      checkHistory: await prisma.checkHistory.count(),
      auditLogs: await prisma.auditLog.count(),
    };

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: 'Updated Prisma schema test successful!',
      database: 'ok',
      schema: {
        version: 'Improved Schema v2.0',
        features: [
          'Proper field mappings (@map)',
          'UUID primary keys',
          'Proper enums (Role, VendorType, PaymentMethod, etc.)',
          'Check history tracking',
          'Audit logging',
          'Soft deletes (isActive flags)',
          'Better naming conventions',
        ],
      },
      createdEntities: {
        store: { id: testStore.id, name: testStore.name },
        user: { id: testUser.id, username: testUser.username, role: testUser.role },
        bank: { id: testBank.id, bankName: testBank.bankName, accountType: testBank.accountType },
        vendor: { id: testVendor.id, vendorName: testVendor.vendorName, vendorType: testVendor.vendorType },
        check: { id: testCheck.id, referenceNumber: testCheck.referenceNumber, status: testCheck.status },
        history: { id: testHistory.id, action: testHistory.action },
        auditLog: { id: testAuditLog.id, action: testAuditLog.action },
      },
      finalCounts: counts,
      tests: {
        connection: '✅ Success',
        storeCreation: '✅ Store created with new schema',
        userCreation: '✅ User created with role enum and passwordHash',
        bankCreation: '✅ Bank created with accountType enum',
        vendorCreation: '✅ Vendor created with vendorType enum and contact fields',
        checkCreation: '✅ Check created with paymentMethod and status enums',
        historyCreation: '✅ Check history tracking working',
        auditLogCreation: '✅ Audit logging working',
      },
    });

  } catch (error) {
    console.error('❌ Updated schema test failed:', error);
    
    return NextResponse.json(
      { success: false, error: 'Updated schema test failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


