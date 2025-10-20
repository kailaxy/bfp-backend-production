# 🔥 BFP Database Migration Guide - Local to Render

## 📊 **Your Local Database Analysis:**

**Total Records**: 10,334 across 11 tables
**Critical BFP Data**:
- 📋 **historical_fires**: 1,299 records (2010-2024)
- 📈 **forecasts**: 324 records (12-month predictions)
- 🏘️ **barangays**: 27 records (Mandaluyong areas)
- 👥 **users**: 5 records (admin/responder accounts)
- 🚒 **mandaluyong_fire_stations**: 11 records
- 💧 **hydrants**: 155 records
- 🔔 **notifications**: 8 records
- 🔥 **active_fires**: 1 record

---

## 🚀 **Migration Process:**

### **Step 1: Create Backup (Recommended)**
```bash
node scripts/database_backup.js
```
This creates a complete SQL backup of your local database for safety.

### **Step 2: Get Render Database URL**
1. Go to your Render Dashboard
2. Navigate to your PostgreSQL database
3. Copy the **External Database URL** (starts with `postgresql://`)
4. It should look like: `postgresql://username:password@hostname:port/database`

### **Step 3: Run Migration**
```bash
node scripts/database_migration.js "your_render_database_url_here"
```

**Example:**
```bash
node scripts/database_migration.js "postgresql://bfp_user:securepass123@dpg-abc123-a.oregon-postgres.render.com/bfp_db_xyz"
```

---

## 🔧 **What the Migration Does:**

### **Schema Migration**:
✅ Creates all 11 tables in Render database
✅ Preserves column types, constraints, and structure
✅ Handles PostgreSQL-specific features

### **Data Migration**:
✅ Transfers all 10,334 records in batches
✅ Handles conflicts gracefully (ON CONFLICT DO NOTHING)
✅ Verifies record counts after transfer
✅ Reports detailed progress and results

### **Critical Data Transferred**:
- 🔥 **All historical fire incidents** (15 years of data)
- 📊 **Current forecasts** (ARIMA predictions)
- 👥 **User accounts** (admin/responder access)
- 🏘️ **Barangay boundaries** (GIS data)
- 🚒 **Fire stations** (emergency response)
- 💧 **Hydrant locations** (water sources)

---

## ⚠️ **Important Notes:**

### **Before Migration**:
1. **Backup your local database** using the backup script
2. **Ensure Render database is empty** or ready for data
3. **Have your Render database URL** ready
4. **Check network connection** (large data transfer)

### **During Migration**:
- Migration may take 5-15 minutes depending on connection
- Progress is shown for each table
- Errors are logged but don't stop the process
- Verification runs after each table

### **After Migration**:
- **Update your .env files** to point to Render database
- **Test your application** with the new database
- **Verify critical data** (users, forecasts, historical fires)

---

## 🎯 **Quick Start Commands:**

```bash
# 1. Create backup first (optional but recommended)
node scripts/database_backup.js

# 2. Run the analysis to see what will be migrated
node scripts/analyze_database.js

# 3. Migrate everything to Render (replace with your URL)
node scripts/database_migration.js "postgresql://your_render_database_url"
```

---

## 🔍 **Verification After Migration:**

The script automatically verifies that all records were transferred correctly by comparing counts between local and Render databases.

**Manual verification:**
1. Check your Render database dashboard
2. Verify critical tables have expected record counts
3. Test your BFP application with Render database
4. Check that forecasts and historical data display properly

---

## 🆘 **Troubleshooting:**

### **Common Issues**:
- **Connection timeout**: Use smaller batch sizes
- **SSL errors**: Script handles SSL automatically
- **Permission errors**: Ensure database user has full access
- **Constraint errors**: Script uses ON CONFLICT DO NOTHING

### **If Migration Fails**:
1. Check error messages in the output
2. Verify Render database URL is correct
3. Ensure Render database is accessible
4. Try running specific table migrations

---

## ✅ **Ready to Migrate!**

Your local BFP database contains valuable fire prediction data spanning 15 years. The migration tool will safely transfer everything to Render while preserving data integrity.

**Run this when ready:**
```bash
node scripts/database_migration.js "your_render_database_url"
```