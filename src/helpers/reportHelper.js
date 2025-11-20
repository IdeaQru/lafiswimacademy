// backend/src/helpers/reportHelper.js - COMPLETE FIXED VERSION

const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
const Coach = require('../models/Coach');
const Student = require('../models/Student');
const TrainingEvaluation = require('../models/TrainingEvaluation');
const Payment = require('../models/Payment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ✅ HELPER 1: GET STUDENT EXPORT DATA
// ═══════════════════════════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ✅ HELPER 2: GET COACH EXPORT DATA - COMPLETE FIXED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ✅ Get coach export data - FIXED: Support 3 schedule types
 */
/**
 * ✅ GET COACH EXPORT DATA - COMPLETE WITH ATTENDANCE-BASED LOGIC
 * Support: Private, Semi Private, Group schedules
 * Logic: Completed/Cancelled based on student attendance
 */
async function getCoachExportData(startDate, endDate, coachId = null, userRole = 'admin', userCoachId = null) {
  try {
    console.log('\n' + '='.repeat(100));
    console.log('📊 Get coach export data - FIXED: 3 schedule types + Attendance Logic');
    console.log('='.repeat(100));
    console.log('   User:', { role: userRole, coachId: userCoachId });
    console.log('   Params:', { startDate, endDate, coachId });

    const scheduleFilter = {};
    
    if (startDate && endDate) {
      scheduleFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // ==================== PERMISSION ====================
    let filterCoachId = coachId;

    if (userRole === 'coach') {
      if (coachId && coachId !== userCoachId) {
        throw new Error('Anda hanya bisa export laporan Anda sendiri');
      }
      filterCoachId = userCoachId;
      console.log(`   🔒 AUTO-FILTER: Coach ${filterCoachId}`);
    }

    let coachObjectId = null;
    if (filterCoachId) {
      if (filterCoachId.match(/^[0-9a-fA-F]{24}$/)) {
        coachObjectId = new mongoose.Types.ObjectId(filterCoachId);
      }
    }

    if (!coachObjectId && filterCoachId) {
      throw new Error('Coach tidak ditemukan');
    }

    // ==================== FETCH SCHEDULES - FIXED: 3 TYPES ====================
    console.log('\n📅 Fetching schedules...');

    const scheduleFilter2 = { ...scheduleFilter };
    
    if (coachObjectId) {
      scheduleFilter2.$or = [
        { coachId: coachObjectId, scheduleType: 'private' },
        { 'coaches._id': coachObjectId, scheduleType: 'semiPrivate' },
        { 'coaches._id': coachObjectId, scheduleType: 'group' }
      ];
    }

    const schedules = await Schedule.find(scheduleFilter2)
      .populate('coachId', '_id coachId fullName')
      .populate('studentId', '_id studentId fullName classLevel')
      .populate('students', '_id studentId fullName classLevel')
      .populate('coaches', '_id coachId fullName')
      .lean()
      .sort({ date: -1 })
      .limit(1000)
      .exec();

    console.log(`✅ Found ${schedules.length} schedules`);

    if (schedules.length === 0) {
      return { coaches: [] };
    }

    // ==================== NORMALIZE SCHEDULES - FIXED: 3 TYPES ====================
    console.log('\n📊 Normalizing schedules...');

    const normalizedSchedules = schedules.map((schedule) => {
      let students = [];
      let mainCoachId = null;

      if (schedule.scheduleType === 'private') {
        // ✅ PRIVATE
        if (Array.isArray(schedule.students) && schedule.students.length > 0) {
          students = schedule.students.map(s => ({
            _id: s._id.toString(),
            studentId: s.studentId,
            fullName: s.fullName,
          }));
        } else if (schedule.studentId) {
          students = [{
            _id: schedule.studentId._id.toString(),
            studentId: schedule.studentId.studentId,
            fullName: schedule.studentId.fullName,
          }];
        }
        
        if (schedule.coachId) {
          mainCoachId = schedule.coachId._id.toString();
        }
      }
      else if (schedule.scheduleType === 'semiPrivate') {
        // ✅ SEMI PRIVATE
        students = (schedule.students || []).map(s => ({
          _id: s._id.toString(),
          studentId: s.studentId,
          fullName: s.fullName,
        }));

        if (Array.isArray(schedule.coaches) && schedule.coaches.length > 0) {
          if (userCoachId) {
            const userCoachObjectId = new mongoose.Types.ObjectId(userCoachId);
            const matchedCoach = schedule.coaches.find(c => {
              const cId = c._id?.toString?.() || c._id.toString();
              return cId === userCoachObjectId.toString();
            });
            
            if (matchedCoach) {
              mainCoachId = matchedCoach._id.toString();
            } else {
              mainCoachId = schedule.coaches[0]._id.toString();
            }
          } else {
            mainCoachId = schedule.coaches[0]._id.toString();
          }
        }
      }
      else if (schedule.scheduleType === 'group') {
        // ✅ GROUP
        students = (schedule.students || []).map(s => ({
          _id: s._id.toString(),
          studentId: s.studentId,
          fullName: s.fullName,
        }));

        if (Array.isArray(schedule.coaches) && schedule.coaches.length > 0) {
          if (userCoachId) {
            const userCoachObjectId = new mongoose.Types.ObjectId(userCoachId);
            const matchedCoach = schedule.coaches.find(c => {
              const cId = c._id?.toString?.() || c._id.toString();
              return cId === userCoachObjectId.toString();
            });
            
            if (matchedCoach) {
              mainCoachId = matchedCoach._id.toString();
            } else {
              mainCoachId = schedule.coaches[0]._id.toString();
            }
          } else {
            mainCoachId = schedule.coaches[0]._id.toString();
          }
        }
      }

      return {
        ...schedule,
        students,
        mainCoachId
      };
    });

    console.log(`✅ Normalized`);

    // ==================== GET COACH DATA FROM COACHES COLLECTION ====================
    console.log('\n👥 Fetching coach data from Coaches collection...');

    const coachIds = new Set(normalizedSchedules
      .filter(s => s.mainCoachId)
      .map(s => new mongoose.Types.ObjectId(s.mainCoachId)));

    const coachesFromDB = await Coach.find({ _id: { $in: Array.from(coachIds) } })
      .select('_id coachId fullName')
      .lean();

    const coachDataMap = new Map();
    coachesFromDB.forEach(coach => {
      coachDataMap.set(coach._id.toString(), {
        _id: coach._id.toString(),
        coachId: coach.coachId,
        fullName: coach.fullName
      });
    });

    console.log(`✅ Found ${coachesFromDB.length} coaches`);

    // ==================== GET EVALUATIONS ====================
    console.log('\n📋 Fetching evaluations...');

    const scheduleIds = normalizedSchedules.map(s => s._id);
    
    const evaluations = await TrainingEvaluation
      .find({ scheduleId: { $in: scheduleIds } })
      .populate('studentId', '_id studentId fullName classLevel')
      .populate('coachIds', '_id coachId fullName')
      .lean()
      .exec();

    console.log(`✅ Found ${evaluations.length} evaluations`);

    // ==================== BUILD EVALUATION MAP ====================
    console.log('\n🗂️ Building evaluation map...');
    
    const evaluationMap = {};
    evaluations.forEach(ev => {
      const scheduleId = ev.scheduleId.toString();
      if (!evaluationMap[scheduleId]) evaluationMap[scheduleId] = [];
      
      const coachNames = (ev.coachIds || []).map(c => c.fullName).join(', ');
      
      evaluationMap[scheduleId].push({
        studentName: ev.studentId?.fullName || 'Unknown',
        studentId: ev.studentId?.studentId || '-',
        attendance: ev.attendance || 'Tidak Hadir',
        notes: ev.notes || '-',
        coachNames: coachNames
      });
    });

    console.log(`✅ Evaluation map built: ${Object.keys(evaluationMap).length} schedules with evaluations`);

    // ==================== BUILD COACH MAP - ATTENDANCE-BASED ====================
    console.log('\n👥 Building coach map with attendance logic...');

    const coachMap = {};
    
    normalizedSchedules.forEach(schedule => {
      if (!schedule.mainCoachId) return;

      const coachDataFromDB = coachDataMap.get(schedule.mainCoachId);
      if (!coachDataFromDB) {
        console.warn(`⚠️ Coach data not found: ${schedule.mainCoachId}`);
        return;
      }

      const coachKey = schedule.mainCoachId;

      if (!coachMap[coachKey]) {
        coachMap[coachKey] = {
          _id: coachDataFromDB._id,
          coachId: coachDataFromDB.coachId,
          name: coachDataFromDB.fullName,
          totalSessions: 0,
          scheduleTypeStats: {},
          sessions: []
        };

        console.log(`   ✅ Coach added: ${coachDataFromDB.fullName} (${coachDataFromDB.coachId})`);
      }

      coachMap[coachKey].totalSessions++;

      const scheduleType = schedule.scheduleType || 'Unknown';
      const programCategory = schedule.programCategory || 'General';
      const typeKey = `${scheduleType} (${programCategory})`;
      
      if (!coachMap[coachKey].scheduleTypeStats[typeKey]) {
        coachMap[coachKey].scheduleTypeStats[typeKey] = {
          scheduleType,
          programCategory,
          total: 0,
          completed: 0,
          cancelled: 0
        };
      }
      
      coachMap[coachKey].scheduleTypeStats[typeKey].total++;

      // ✅ GET EVALUATIONS FOR THIS SCHEDULE
      const scheduleId = schedule._id.toString();
      const sessionEvaluations = evaluationMap[scheduleId] || [];
      
      console.log(`\n   📋 Schedule ${scheduleId}:`);
      console.log(`      Type: ${scheduleType} (${programCategory})`);
      console.log(`      Status: ${schedule.status}`);
      console.log(`      Date: ${schedule.date}`);
      console.log(`      Evaluations: ${sessionEvaluations.length}`);

      // ✅ CHECK ATTENDANCE STATUS
      let hasHadir = false;
      let hasCancelled = false;

      sessionEvaluations.forEach(ev => {
        const attendance = (ev.attendance || '').toLowerCase().trim();
        
        console.log(`      → Student: ${ev.studentName} | Attendance: "${ev.attendance}" → normalized: "${attendance}"`);
        
        if (attendance === 'hadir') {
          hasHadir = true;
        } else if (attendance === 'sakit' || attendance === 'izin' || attendance === 'tidak hadir') {
          hasCancelled = true;
        }
      });

      console.log(`      → Analysis: hasHadir=${hasHadir}, hasCancelled=${hasCancelled}`);

      // ✅ ATTENDANCE-BASED COUNTING LOGIC
      let resultStatus = '';

      if (schedule.status === 'cancelled' || schedule.status === 'rescheduled') {
        // 1. Schedule cancelled by system
        coachMap[coachKey].scheduleTypeStats[typeKey].cancelled++;
        resultStatus = 'CANCELLED (schedule status)';
      } 
      else if (new Date(schedule.date) > new Date()) {
        // 2. Future schedule - skip counting (don't count as completed or cancelled)
        resultStatus = 'UPCOMING (future - skip count)';
      }
      else if (sessionEvaluations.length === 0) {
        // 3. No evaluation yet - default cancelled
        coachMap[coachKey].scheduleTypeStats[typeKey].cancelled++;
        resultStatus = 'CANCELLED (no evaluation)';
      }
      else if (hasHadir) {
        // 4. At least one student present - COMPLETED
        coachMap[coachKey].scheduleTypeStats[typeKey].completed++;
        resultStatus = 'COMPLETED (has attendance)';
      } 
      else if (hasCancelled) {
        // 5. All students absent (sakit/izin/tidak hadir) - CANCELLED
        coachMap[coachKey].scheduleTypeStats[typeKey].cancelled++;
        resultStatus = 'CANCELLED (all absent)';
      }
      else {
        // 6. Fallback to schedule status
        if (schedule.status === 'completed') {
          coachMap[coachKey].scheduleTypeStats[typeKey].completed++;
          resultStatus = 'COMPLETED (fallback)';
        } else {
          coachMap[coachKey].scheduleTypeStats[typeKey].cancelled++;
          resultStatus = 'CANCELLED (fallback)';
        }
      }

      console.log(`      ✅ RESULT: ${resultStatus}`);
      console.log(`      → Stats: Total=${coachMap[coachKey].scheduleTypeStats[typeKey].total}, Completed=${coachMap[coachKey].scheduleTypeStats[typeKey].completed}, Cancelled=${coachMap[coachKey].scheduleTypeStats[typeKey].cancelled}`);

      const students = schedule.students || [];

      coachMap[coachKey].sessions.push({
        scheduleId: schedule._id.toString(),
        date: schedule.date,
        time: `${schedule.startTime} - ${schedule.endTime}`,
        location: schedule.location || '-',
        program: schedule.program || '-',
        scheduleType: schedule.scheduleType || '-',
        programCategory: schedule.programCategory || '-',
        groupName: schedule.groupName || '',
        status: schedule.status?.charAt(0).toUpperCase() + schedule.status?.slice(1) || 'Unknown',
        studentCount: students.length,
        studentNames: students.map(s => s.fullName),
        students: students.map(s => s.fullName).join(', '),
        evaluations: sessionEvaluations
      });
    });

    console.log(`✅ ${Object.keys(coachMap).length} unique coaches processed`);

    // ✅ FINAL STATS FOR DEBUGGING
    console.log('\n📊 FINAL COACH STATISTICS:');
    Object.values(coachMap).forEach(coach => {
      console.log(`\n${coach.name} (${coach.coachId}):`);
      Object.entries(coach.scheduleTypeStats).forEach(([typeKey, stat]) => {
        console.log(`  ${typeKey}:`);
        console.log(`    Total: ${stat.total}, Completed: ${stat.completed}, Cancelled: ${stat.cancelled}`);
      });
    });

    // ==================== FORMAT RESPONSE ====================
    const coaches = Object.values(coachMap).map(coach => ({
      name: coach.name,
      id: coach.coachId,
      totalSessions: coach.totalSessions,
      scheduleTypeStats: Object.keys(coach.scheduleTypeStats)
        .map(typeKey => ({
          ...coach.scheduleTypeStats[typeKey],
          typeKey: typeKey
        }))
        .sort((a, b) => b.total - a.total),
      sessions: coach.sessions
    }));

    console.log('\n' + '='.repeat(100));
    console.log('✅ Coach export data COMPLETE');
    coaches.forEach(c => {
      console.log(`   Coach: ${c.name} (${c.id}) - Sessions: ${c.totalSessions}`);
    });
    console.log('='.repeat(100) + '\n');

    return { coaches };
  } catch (error) {
    console.error('❌ Error getCoachExportData:', error);
    throw error;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ✅ HELPER 3: GET FINANCIAL EXPORT DATA
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ✅ Get financial export data
 */
async function getFinancialExportData(startDate, endDate) {
  try {
    console.log('💰 Getting financial export data');

    const paymentFilter = {};
    if (startDate && endDate) {
      paymentFilter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(paymentFilter)
      .populate('studentId', 'studentId fullName')
      .lean()
      .sort({ paymentDate: -1 })
      .limit(2000)
      .exec();

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const stats = {
      totalPayments: payments.length,
      paidCount: payments.filter(p => p.status === 'paid').length,
      pendingCount: payments.filter(p => p.status === 'pending').length,
      averagePayment: payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0
    };

    return {
      payments: payments.map(p => ({
        date: p.paymentDate,
        student: p.studentName || p.studentId?.fullName || 'Unknown',
        month: p.month || '-',
        amount: p.amount || 0,
        method: p.method || '-',
        status: p.status || 'unknown'
      })),
      totalRevenue,
      stats
    };
  } catch (error) {
    console.error('❌ Error getFinancialExportData:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ✅ PDF EXPORT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ✅ COMPLETE: Export to PDF dengan margin global, header, footer, dan layout rapi
 */
async function exportToPDFBeautiful(res, title, data, reportType, startDate, endDate) {
  try {
    // ==================== KONFIGURASI PDF ====================
    const margins = {
      top: 50,
      bottom: 70,    // Ruang untuk footer
      left: 50,
      right: 50
    };

    const doc = new PDFDocument({
      size: 'A4',
      margins: margins,
      bufferPages: true
    });

    // ==================== SET RESPONSE HEADERS ====================
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-${reportType}-${Date.now()}.pdf`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    doc.pipe(res);

    // ==================== HEADER ====================
    const headerHeight = 95;
    doc.rect(0, 0, doc.page.width, headerHeight).fill('#0ea5e9');

    doc.fillColor('#ffffff')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('LAFI SWIMMING ACADEMY', margins.left, 15, {
        width: doc.page.width - margins.left - margins.right,
        align: 'center'
      });

    doc.fontSize(16)
      .font('Helvetica-Bold')
      .text(title, margins.left, 42, {
        width: doc.page.width - margins.left - margins.right,
        align: 'center'
      });

    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#e0f2fe')
      .text(
        `Periode: ${startDate || 'Semua'} s/d ${endDate || 'Semua'}`,
        margins.left,
        65,
        { width: doc.page.width - margins.left - margins.right, align: 'center' }
      );

    doc.fontSize(9)
      .fillColor('#cffafe')
      .text(
        `Dicetak: ${new Date().toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`,
        margins.left,
        78,
        { width: doc.page.width - margins.left - margins.right, align: 'center' }
      );

    doc.fillColor('#000000');

    // ==================== CONTENT AREA ====================
    doc.moveDown(3);

    if (reportType === 'student-individual') {
      await renderStudentPDF(doc, data, margins);
    } else if (reportType === 'coach') {
      await renderCoachPDF(doc, data.coaches, margins);
    } else if (reportType === 'financial') {
      await renderFinancialPDF(doc, data, margins);
    }

    // ==================== FOOTER ====================
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      const footerLineY = doc.page.height - margins.bottom  - 10;
      const footerTextY = doc.page.height - margins.bottom - 10;

      doc.strokeColor('#d1d5db')
        .lineWidth(0.5)
        .moveTo(margins.left, footerLineY)
        .lineTo(doc.page.width - margins.right, footerLineY)
        .stroke();

      doc.fontSize(8)
        .fillColor('#6b7280')
        .font('Helvetica')
        .text(
          `Halaman ${i + 1} dari ${pages.count}`,
          margins.left,
          footerTextY,
          {
            width: doc.page.width - margins.left - margins.right,
            align: 'center'
          }
        );

      doc.fontSize(7)
        .fillColor('#9ca3af')
        .text(
          'LAFI Swimming Academy',
          margins.left,
          footerTextY - 7,
          { width: doc.page.width - margins.left - margins.right, align: 'left' }
        );

      doc.fontSize(7)
        .text(
          `© ${new Date().getFullYear()}`,
          margins.left,
          footerTextY - 7,
          { width: doc.page.width - margins.left - margins.right, align: 'right' }
        );

      doc.fillColor('#000000');
    }

    doc.end();
  } catch (error) {
    console.error('❌ Error PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating PDF',
        error: error.message
      });
    }
  }
}

// ==================== PDF RENDER: STUDENT ====================
async function renderStudentPDF(doc, data, margins) {
  let y = 125;
  const safeOffset = 40;

  doc.roundedRect(50, y, doc.page.width - 100, 65, 5)
    .fillAndStroke('#f0f9ff', '#0ea5e9');
  doc.fillColor('#0ea5e9').fontSize(12).font('Helvetica-Bold')
    .text(`SISWA: ${data.student.fullName}`, 70, y + 10);
  doc.fontSize(9).fillColor('#1e293b').font('Helvetica')
    .text(`ID: ${data.student.studentId}`, 70, y + 28)
    .text(`Total Sesi: ${data.history.length}`, 70, y + 56);

  y += 75;

  doc.rect(50, y, doc.page.width - 100, 16).fill('#0ea5e9');
  doc.fillColor('#fff').fontSize(6).font('Helvetica-Bold')
    .text('Tanggal', 60, y + 4, { width: 40 })
    .text('Waktu', 105, y + 4, { width: 35 })
    .text('Tipe', 145, y + 4, { width: 30 })
    .text('Program', 220, y + 4, { width: 40 })
    .text('Pelatih', 265, y + 4, { width: 60 })
    .text('Kehadiran', 330, y + 4, { width: 35 })
    .text('Catatan', 370, y + 4, { width: 125 });

  y += 18;

  data.history.forEach((item, i) => {
    if (y > doc.page.height - margins.bottom - safeOffset) {
      doc.addPage();
      y = margins.top;
    }

    const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
    doc.rect(50, y, doc.page.width - 100, 14).fill(bgColor);

    doc.fillColor('#000').fontSize(5.5).font('Helvetica')
      .text(new Date(item.date).toLocaleDateString('id-ID'), 60, y + 2, { width: 40 })
      .text(item.time, 105, y + 2, { width: 35 })
      .text(item.scheduleType || '-', 145, y + 2, { width: 30 })
      .text(item.program, 220, y + 2, { width: 40 })
      .text(item.coachNames, 265, y + 2, { width: 60 })
      .text(item.attendance, 330, y + 2, { width: 35 })
      .text(item.notes, 370, y + 2, { width: 125 });

    y += 14;
  });
}

// ==================== PDF RENDER: COACH ====================
async function renderCoachPDF(doc, coaches, margins) {
  let y = 125;
  const safeOffset = 40;

  coaches.forEach(coach => {
    if (y > doc.page.height - margins.bottom - safeOffset) {
      doc.addPage();
      y = margins.top;
    }

    doc.roundedRect(50, y, doc.page.width - 100, 35, 5)
      .fillAndStroke('#f0fdf4', '#10b981');
    doc.fillColor('#10b981').fontSize(11).font('Helvetica-Bold')
      .text(`${coach.name || coach.coachName || 'Unknown'} (${coach.id || coach.coachId || '-'})`, 70, y + 8);
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
      .text(`Total Sesi: ${coach.totalSessions}`, 400, y + 18);

    y += 45;

    if (coach.scheduleTypeStats && coach.scheduleTypeStats.length > 0) {
      doc.fontSize(8).fillColor('#10b981').font('Helvetica-Bold')
        .text('STATISTIK SCHEDULE TYPE:', 60, y);
      y += 12;

      doc.rect(50, y, doc.page.width - 100, 14).fill('#10b981');
      doc.fillColor('#fff').fontSize(6).font('Helvetica-Bold')
        .text('Schedule Type (Kategori)', 60, y + 3, { width: 200 })
        .text('Total', 265, y + 3, { width: 35 })
        .text('Selesai', 305, y + 3, { width: 35 })
        .text('Batal', 345, y + 3, { width: 35 });

      y += 16;

      coach.scheduleTypeStats.forEach((stat, i) => {
        const bgColor = i % 2 === 0 ? '#f0fdf4' : '#ffffff';
        doc.rect(50, y, doc.page.width - 100, 12).fill(bgColor);

        doc.fillColor('#000').fontSize(5.5).font('Helvetica')
          .text(stat.typeKey || `${stat.scheduleType} (${stat.programCategory})`, 60, y + 2, { width: 200 })
          .text(stat.total.toString(), 265, y + 2, { width: 35 })
          .text(stat.completed.toString(), 305, y + 2, { width: 35 })
          .text(stat.cancelled.toString(), 345, y + 2, { width: 35 });

        y += 12;
      });

      y += 8;
    }

    if (coach.sessions && coach.sessions.length > 0) {
      doc.fontSize(8).fillColor('#0369a1').font('Helvetica-Bold')
        .text('DAFTAR SESI & EVALUASI SISWA:', 60, y);
      y += 12;

      coach.sessions.forEach(session => {
        if (y > doc.page.height - margins.bottom - safeOffset) {
          doc.addPage();
          y = margins.top;
        }

        doc.rect(50, y, doc.page.width - 100, 14).fill('#e0f2fe');
        doc.fillColor('#0369a1').fontSize(6.5).font('Helvetica-Bold')
          .text(`${session.scheduleType} | ${new Date(session.date).toLocaleDateString('id-ID')} | ${session.time}`, 60, y + 3, { width: 300 })
          .text(`${session.programCategory}`, 380, y + 3, { width: 165 });

        y += 16;

        doc.fillColor('#000').fontSize(6).font('Helvetica')
          .text(`Program: ${session.program} | Lokasi: ${session.location}`, 60, y);
        y += 10;

        doc.fillColor('#0ea5e9').fontSize(6).font('Helvetica-Bold')
          .text(`Siswa: ${Array.isArray(session.students) ? session.students.length : session.studentCount}`, 60, y);
        y += 10;

        if (session.evaluations && session.evaluations.length > 0) {
          doc.rect(50, y, doc.page.width - 100, 12).fill('#10b981');
          doc.fillColor('#fff').fontSize(6).font('Helvetica-Bold')
            .text('Siswa', 60, y + 2, { width: 100 })
            .text('Kehadiran', 165, y + 2, { width: 50 })
            .text('Catatan', 220, y + 2, { width: 325 });

          y += 14;

          session.evaluations.forEach((athlete, aidx) => {
            if (y > doc.page.height - margins.bottom - safeOffset) {
              doc.addPage();
              y = margins.top;
            }

            const bgColor = aidx % 2 === 0 ? '#f9fafb' : '#ffffff';
            const noteLines = (athlete.notes || '').split('\n').length || 1;
            const rowHeight = Math.max(12, noteLines * 8 + 2);

            doc.rect(50, y, doc.page.width - 100, rowHeight).fill(bgColor);

            doc.fillColor('#000').fontSize(5.5).font('Helvetica')
              .text(athlete.studentName, 60, y + 2, { width: 100 })
              .text(athlete.attendance, 165, y + 2, { width: 50 });

            doc.fillColor('#000').fontSize(5.5).font('Helvetica')
              .text(athlete.notes, 220, y + 2, {
                width: 325,
                height: rowHeight - 4,
                align: 'left'
              });

            y += rowHeight;
          });
        }

        y += 6;
      });
    }

    y += 10;
  });
}

// ==================== PDF RENDER: FINANCIAL ====================
async function renderFinancialPDF(doc, data, margins) {
  let y = 125;
  const safeOffset = 40;

  doc.roundedRect(50, y, doc.page.width - 100, 65, 5)
    .fillAndStroke('#fef3c7', '#f59e0b');
  doc.fillColor('#f59e0b').fontSize(12).font('Helvetica-Bold')
    .text(`Total Pendapatan: Rp ${data.totalRevenue.toLocaleString('id-ID')}`, 70, y + 10);
  doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
    .text(`Total Transaksi: ${data.stats.totalPayments}`, 70, y + 28)
    .text(`Lunas: ${data.stats.paidCount} | Pending: ${data.stats.pendingCount}`, 70, y + 42)
    .text(`Rata-rata: Rp ${data.stats.averagePayment.toLocaleString('id-ID')}`, 70, y + 56);

  y += 75;

  doc.rect(50, y, doc.page.width - 100, 14).fill('#f59e0b');
  doc.fillColor('#fff').fontSize(6).font('Helvetica-Bold')
    .text('Tanggal', 60, y + 3, { width: 60 })
    .text('Siswa', 125, y + 3, { width: 100 })
    .text('Bulan', 230, y + 3, { width: 50 })
    .text('Jumlah', 285, y + 3, { width: 60 })
    .text('Metode', 350, y + 3, { width: 45 });

  y += 16;

  data.payments.slice(0, 50).forEach((p, i) => {
    if (y > doc.page.height - margins.bottom - safeOffset) {
      doc.addPage();
      y = margins.top;
    }

    const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
    doc.rect(50, y, doc.page.width - 100, 12).fill(bgColor);

    doc.fillColor('#000').fontSize(6).font('Helvetica')
      .text(new Date(p.date).toLocaleDateString('id-ID'), 60, y + 2, { width: 60 })
      .text(p.student, 125, y + 2, { width: 100, ellipsis: true })
      .text(p.month, 230, y + 2, { width: 50 })
      .text(`Rp ${p.amount.toLocaleString('id-ID')}`, 285, y + 2, { width: 60 })
      .text(p.method, 350, y + 2, { width: 45 });

    y += 12;
  });
}

// backend/src/helpers/reportHelper.js



// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ✅ STUDENT REPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ✅ Get student export data (LATEST from database)
 * @param {string} studentId - Student ID (MongoDB ObjectId or studentId)
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} { student, history }
 */
async function getStudentExportData(studentId, startDate, endDate) {
  try {
    console.log('📊 Getting student export data...');
    console.log('   Student ID:', studentId);
    console.log('   Date range:', { startDate, endDate });

    // ==================== GET STUDENT ====================
    const student = await Student.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(studentId) ? studentId : null },
        { studentId: studentId }
      ]
    }).lean();

    if (!student) {
      throw new Error('Siswa tidak ditemukan');
    }

    console.log('   Student found:', student.fullName);

    // ==================== BUILD EVALUATION FILTER ====================
    const evalFilter = { 
      studentId: student._id 
    };

    if (startDate && endDate) {
      evalFilter.trainingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // ==================== GET EVALUATIONS (LATEST DATA) ====================
    const evaluations = await TrainingEvaluation.find(evalFilter)
      .populate('coachIds', '_id coachId fullName')
      .populate('scheduleId', 'startTime endTime location program scheduleType programCategory')
      .sort({ trainingDate: -1 })
      .lean();

    console.log(`   ✅ Found ${evaluations.length} evaluations`);

    // ==================== FORMAT HISTORY ====================
    const history = evaluations.map(ev => {
      const schedule = ev.scheduleId || {};
      const coachNames = (ev.coachIds || [])
        .map(c => c.fullName)
        .join(', ') || '-';

      return {
        date: ev.trainingDate,
        time: schedule.startTime && schedule.endTime 
          ? `${schedule.startTime} - ${schedule.endTime}` 
          : '-',
        location: schedule.location || '-',
        program: schedule.program || '-',
        scheduleType: schedule.scheduleType || '-',
        programCategory: schedule.programCategory || '-',
        coachNames: coachNames,
        attendance: ev.attendance || 'Tidak Hadir',
        notes: ev.notes || '-',
        createdAt: ev.createdAt
      };
    });

    console.log('   ✅ Export data ready');

    return { 
      student: {
        _id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        phone: student.phone,
        status: student.status,
        classLevel: student.classLevel
      },
      history 
    };

  } catch (error) {
    console.error('❌ Error getStudentExportData:', error);
    throw error;
  }
}

async function generateStudentPDFToFile(studentId, startDate, endDate, outputPath) {
  try {
    console.log('📄 Generating student PDF to file...');
    console.log('   Student ID:', studentId);
    console.log('   Date range:', { startDate, endDate });
    console.log('   Output:', outputPath);

    // ✅ Get LATEST data from database
    const data = await getStudentExportData(studentId, startDate, endDate);

    if (!data || !data.student) {
      throw new Error('No data found for student');
    }

    // ==================== CALCULATE STATS ====================
    const stats = {
      total: data.history.length,
      hadir: data.history.filter(h => h.attendance.toLowerCase() === 'hadir').length,
      tidakHadir: data.history.filter(h => h.attendance.toLowerCase() === 'tidak hadir').length,
      izin: data.history.filter(h => h.attendance.toLowerCase() === 'izin').length,
      sakit: data.history.filter(h => h.attendance.toLowerCase() === 'sakit').length
    };
    
    stats.attendanceRate = stats.total > 0 
      ? Math.round((stats.hadir / stats.total) * 100) 
      : 0;

    console.log('   Stats:', stats);

    // ==================== CREATE PDF DOCUMENT ====================
    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'A4', 
      bufferPages: true 
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // ==================== PDF HEADER ====================
    const title = 'Laporan Riwayat Latihan';
    const startDateStr = startDate 
      ? new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Semua';
    const endDateStr = endDate 
      ? new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Semua';

    // Blue header background
    doc.rect(0, 0, doc.page.width, 100).fill('#0ea5e9');
    
    doc.fillColor('#ffffff')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('LAFI SWIMMING ACADEMY', 50, 20, { align: 'center' });
    
    doc.fontSize(14)
       .text(title, 50, 45, { align: 'center' });
    
    doc.fontSize(9)
       .font('Helvetica')
       .text(`Periode: ${startDateStr} s/d ${endDateStr}`, 50, 65, { align: 'center' });
    
    const printedDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    doc.text(`Dicetak: ${printedDate} WIB`, 50, 78, { align: 'center' });

    doc.moveDown(2).fillColor('#000000');

    // ==================== STUDENT INFO CARD ====================
    let y = 125;
    
    doc.roundedRect(50, y, doc.page.width - 100, 95, 5)
       .fillAndStroke('#f0f9ff', '#0ea5e9');
    
    doc.fillColor('#0ea5e9')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(`SISWA: ${data.student.fullName}`, 70, y + 10);
    
    doc.fontSize(9)
       .fillColor('#1e293b')
       .font('Helvetica')
       .text(`ID: ${data.student.studentId}`, 70, y + 28)
       .text(`Status: ${data.student.status}`, 70, y + 42)
       .text(`Total Sesi: ${stats.total}`, 70, y + 56)
       .text(`Hadir: ${stats.hadir} sesi (${stats.attendanceRate}%)`, 70, y + 70);

    y += 105;

    // ==================== TABLE HEADER ====================
    doc.rect(50, y, doc.page.width - 100, 18)
       .fill('#0ea5e9');
    
    doc.fillColor('#fff')
       .fontSize(7)
       .font('Helvetica-Bold')
       .text('No', 60, y + 5, { width: 25 })
       .text('Tanggal', 90, y + 5, { width: 55 })
       .text('Waktu', 150, y + 5, { width: 40 })
       .text('Tipe', 195, y + 5, { width: 35 })
       .text('Program', 235, y + 5, { width: 55 })
       .text('Pelatih', 295, y + 5, { width: 80 })
       .text('Kehadiran', 380, y + 5, { width: 50 })
       .text('Catatan', 435, y + 5, { width: 110 });

    y += 20;

    // ==================== HISTORY ROWS ====================
    data.history.forEach((item, i) => {
      // Check if need new page
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }

      const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
      doc.rect(50, y, doc.page.width - 100, 16).fill(bgColor);

      doc.fillColor('#000')
         .fontSize(6.5)
         .font('Helvetica')
         .text(i + 1, 60, y + 4, { width: 25 })
         .text(new Date(item.date).toLocaleDateString('id-ID'), 90, y + 4, { width: 55 })
         .text(item.time, 150, y + 4, { width: 40 })
         .text(item.scheduleType || '-', 195, y + 4, { width: 35 })
         .text(item.program || '-', 235, y + 4, { width: 55 })
         .text(item.coachNames, 295, y + 4, { width: 80 })
         .text(item.attendance, 380, y + 4, { width: 50 })
         .text(item.notes, 435, y + 4, { width: 110 });

      y += 16;
    });

    // ==================== FOOTER ON ALL PAGES ====================
    const pages = doc.bufferedPageRange();
    
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.moveTo(50, doc.page.height - 50)
         .lineTo(doc.page.width - 50, doc.page.height - 50)
         .stroke('#e5e7eb');
      
      // Page number
      doc.fontSize(7)
         .fillColor('#6b7280')
         .text(
           `Halaman ${i + 1} dari ${pages.count}`, 
           50, 
           doc.page.height - 40, 
           { 
             align: 'center', 
             width: doc.page.width - 100 
           }
         );
      
      // Footer text
      doc.text(
        'Lafi Swimming Academy - Surabaya', 
        50, 
        doc.page.height - 30, 
        {
          align: 'center',
          width: doc.page.width - 100
        }
      );
    }

    doc.end();

    // ==================== WAIT FOR FILE WRITE TO COMPLETE ====================
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log('   ✅ PDF file generated successfully');

    return {
      filePath: outputPath,
      data: data,
      stats: stats
    };

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
}




// ==================== PDF RENDER: COACH - REMOVED SPECIALIZATION ====================
// ==================== PDF RENDER: COACH - FIXED ENCODING ====================



// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ✅ EXCEL EXPORT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

async function exportToExcelBeautiful(res, title, data, reportType) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title.substring(0, 31));

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true }
    };

    // ==================== STUDENT REPORT ====================
    if (reportType === 'student-individual') {
      worksheet.columns = [
        { header: 'Tanggal', key: 'date', width: 12 },
        { header: 'Waktu', key: 'time', width: 12 },
        { header: 'Lokasi', key: 'location', width: 15 },
        { header: 'Schedule Type', key: 'scheduleType', width: 15 },
        { header: 'Kategori', key: 'programCategory', width: 15 },
        { header: 'Program', key: 'program', width: 18 },
        { header: 'Pelatih', key: 'coachNames', width: 30 },
        { header: 'Kehadiran', key: 'attendance', width: 12 },
        { header: 'Catatan', key: 'notes', width: 40 }
      ];

      worksheet.getRow(1).eachCell(cell => cell.style = headerStyle);

      worksheet.addRow({});
      worksheet.addRow({ date: 'Nama:', time: data.student.fullName });
      worksheet.addRow({ date: 'ID:', time: data.student.studentId });
      worksheet.addRow({});

      data.history.forEach(item => {
        worksheet.addRow({
          date: new Date(item.date).toLocaleDateString('id-ID'),
          time: item.time,
          location: item.location,
          scheduleType: item.scheduleType,
          programCategory: item.programCategory,
          program: item.program,
          coachNames: item.coachNames,
          attendance: item.attendance,
          notes: item.notes
        });
      });
    }
    // ==================== COACH REPORT ====================
    else if (reportType === 'coach') {
      // Sheet 1: Schedule Type Summary
      const summarySheet = workbook.addWorksheet('Ringkasan Schedule Type');
      summarySheet.columns = [
        { header: 'Pelatih', key: 'name', width: 20 },
        { header: 'Schedule Type (Kategori)', key: 'typeKey', width: 30 },
        { header: 'Total', key: 'total', width: 10 },
        { header: 'Selesai', key: 'completed', width: 10 },
        { header: 'Batal', key: 'cancelled', width: 10 }
      ];
      summarySheet.getRow(1).eachCell(cell => cell.style = headerStyle);

      data.coaches.forEach(coach => {
        coach.scheduleTypeStats.forEach((stat, idx) => {
          summarySheet.addRow({
            name: idx === 0 ? coach.name : '',
            typeKey: stat.typeKey,
            total: stat.total,
            completed: stat.completed,
            cancelled: stat.cancelled
          });
        });
        summarySheet.addRow({});
      });

      // Sheet 2: Session Details
      worksheet.columns = [
        { header: 'Pelatih', key: 'name', width: 18 },
        { header: 'Tanggal', key: 'date', width: 12 },
        { header: 'Waktu', key: 'time', width: 12 },
        { header: 'Schedule Type', key: 'scheduleType', width: 15 },
        { header: 'Kategori', key: 'programCategory', width: 15 },
        { header: 'Program', key: 'program', width: 15 },
        { header: 'Lokasi', key: 'location', width: 15 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Siswa', key: 'athlete', width: 20 },
        { header: 'Kehadiran', key: 'attendance', width: 12 },
        { header: 'Catatan', key: 'notes', width: 50 }
      ];

      worksheet.getRow(1).eachCell(cell => cell.style = headerStyle);

      data.coaches.forEach(coach => {
        coach.sessions.forEach(session => {
          if (session.evaluations && session.evaluations.length > 0) {
            session.evaluations.forEach((athlete, idx) => {
              worksheet.addRow({
                name: idx === 0 ? coach.name : '',
                date: new Date(session.date).toLocaleDateString('id-ID'),
                time: session.time,
                scheduleType: session.scheduleType,
                programCategory: session.programCategory,
                program: session.program,
                location: session.location,
                status: session.status,
                athlete: athlete.studentName,
                attendance: athlete.attendance,
                notes: athlete.notes
              });
            });
          } else {
            worksheet.addRow({
              name: coach.name,
              date: new Date(session.date).toLocaleDateString('id-ID'),
              time: session.time,
              scheduleType: session.scheduleType,
              programCategory: session.programCategory,
              program: session.program,
              location: session.location,
              status: session.status,
              athlete: session.students,
              attendance: '-',
              notes: 'Belum ada evaluasi'
            });
          }
        });
      });
    }
    // ==================== FINANCIAL REPORT ====================
    else if (reportType === 'financial') {
      worksheet.columns = [
        { header: 'Tanggal', key: 'date', width: 12 },
        { header: 'Siswa', key: 'student', width: 25 },
        { header: 'Bulan', key: 'month', width: 12 },
        { header: 'Jumlah', key: 'amount', width: 15 },
        { header: 'Metode', key: 'method', width: 12 },
        { header: 'Status', key: 'status', width: 12 }
      ];

      worksheet.getRow(1).eachCell(cell => cell.style = headerStyle);

      data.payments.forEach(p => {
        worksheet.addRow({
          date: new Date(p.date).toLocaleDateString('id-ID'),
          student: p.student,
          month: p.month,
          amount: p.amount,
          method: p.method,
          status: p.status
        });
      });

      const totalRow = worksheet.addRow({
        student: 'TOTAL',
        amount: data.totalRevenue
      });
      totalRow.font = { bold: true };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-${reportType}-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('❌ Error Excel:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error generating Excel' });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 📋 MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

module.exports = {
  getStudentExportData,
  getCoachExportData,
  getFinancialExportData,
  exportToPDFBeautiful,
  exportToExcelBeautiful,
  generateStudentPDFToFile,
};
