


const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
const Coach = require('../models/Coach');
const Student = require('../models/Student');
const TrainingEvaluation = require('../models/TrainingEvaluation');
const Payment = require('../models/Payment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ✅ HELPER 1: GET STUDENT EXPORT DATA
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ✅ Get student export data
 */
async function getStudentExportData(studentId, startDate, endDate) {
  try {
    console.log('📊 Get student export data:', studentId);

    const student = await Student.findOne({
      $or: [{ _id: studentId }, { studentId: studentId }]
    }).lean();

    if (!student) throw new Error('Siswa tidak ditemukan');

    const evalFilter = { studentId: student._id };
    if (startDate && endDate) {
      evalFilter.trainingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const evaluations = await TrainingEvaluation.find(evalFilter)
      .populate('coachIds', '_id coachId fullName specialization')
      .populate('scheduleId', 'startTime endTime location program scheduleType programCategory')
      .sort({ trainingDate: -1 })
      .lean();

    console.log(`✅ Found ${evaluations.length} evaluations`);

    // Format history
    const history = evaluations.map(ev => ({
      date: ev.trainingDate,
      time: ev.scheduleId ? `${ev.scheduleId.startTime} - ${ev.scheduleId.endTime}` : '-',
      location: ev.scheduleId?.location || '-',
      program: ev.scheduleId?.program || '-',
      scheduleType: ev.scheduleId?.scheduleType || '-',
      programCategory: ev.scheduleId?.programCategory || '-',
      coachNames: (ev.coachIds || []).map(c => c.fullName).join(', ') || '-',
      attendance: ev.attendance || 'Tidak Hadir',
      notes: ev.notes || '-'
    }));

    return { student, history };
  } catch (error) {
    console.error('❌ Error getStudentExportData:', error);
    throw error;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ✅ HELPER 2: GET COACH EXPORT DATA - FIXED VERSION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ✅ Get coach export data - FIXED
 * 
 * SISTEM:
 * - Coach role: OTOMATIS filter diri sendiri (coachId dari Coach collection)
 * - Admin role: Bisa lihat semua atau filter specific coach
 * - Hanya ambil coach PERTAMA dari GROUP
 * - coachId HANYA dari Coach collection (bukan evaluation)
 */
// backend/src/helpers/reportHelper.js - COMPLETE FIX

/**
 * ✅ Get coach export data
 * FIXED: Ambil coach data dari Coaches collection (bukan dari populate Schedule)
 */
async function getCoachExportData(startDate, endDate, coachId = null, userRole = 'admin', userCoachId = null) {
  try {
    console.log('\n' + '='.repeat(100));
    console.log('📊 Get coach export data - FIXED: Ambil dari Coaches collection');
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

    // ==================== FETCH SCHEDULES ====================
    console.log('\n📅 Fetching schedules...');

    const scheduleFilter2 = { ...scheduleFilter };
    
    if (coachObjectId) {
      scheduleFilter2.$or = [
        { coachId: coachObjectId, scheduleType: 'private' },
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

    // ==================== NORMALIZE SCHEDULES ====================
    console.log('\n📊 Normalizing schedules...');

    const normalizedSchedules = schedules.map((schedule) => {
      let students = [];
      let mainCoachId = null;

      if (schedule.scheduleType === 'private') {
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
        
        // ✅ PRIVATE: Ambil coachId dari schedule.coachId
        if (schedule.coachId) {
          mainCoachId = schedule.coachId._id.toString();
        }
      }
      else if (schedule.scheduleType === 'group') {
        students = (schedule.students || []).map(s => ({
          _id: s._id.toString(),
          studentId: s.studentId,
          fullName: s.fullName,
        }));

        // ✅ GROUP: Cari coach yang match dengan userCoachId
        if (Array.isArray(schedule.coaches) && schedule.coaches.length > 0) {
          if (userCoachId) {
            const userCoachObjectId = new mongoose.Types.ObjectId(userCoachId);
            const matchedCoach = schedule.coaches.find(c => {
              const cId = c._id?.toString?.() || c._id.toString();
              return cId === userCoachObjectId.toString();
            });
            
            if (matchedCoach) {
              mainCoachId = matchedCoach._id.toString();
              console.log(`   📌 GROUP: Matched coach - ${mainCoachId}`);
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

    // ==================== BUILD COACH MAP ====================
    console.log('\n👥 Building coach map...');

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
      
      if (schedule.status === 'completed') {
        coachMap[coachKey].scheduleTypeStats[typeKey].completed++;
      } else if (schedule.status === 'cancelled') {
        coachMap[coachKey].scheduleTypeStats[typeKey].cancelled++;
      }

      const sessionEvaluations = evaluationMap[schedule._id.toString()] || [];
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

async function exportToPDFBeautiful(res, title, data, reportType, startDate, endDate) {
  try {
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-${reportType}-${Date.now()}.pdf`);

    doc.pipe(res);

    // Header
    doc.rect(0, 0, doc.page.width, 100).fill('#0ea5e9');
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
       .text('LAFI SWIMMING ACADEMY', 50, 20, { align: 'center' });
    doc.fontSize(14).text(title, 50, 45, { align: 'center' });
    doc.fontSize(9).font('Helvetica')
       .text(`Periode: ${startDate || 'Semua'} s/d ${endDate || 'Semua'}`, 50, 65, { align: 'center' });
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 50, 78, { align: 'center' });

    doc.moveDown(2).fillColor('#000000');

    if (reportType === 'student-individual') {
      await renderStudentPDF(doc, data);
    } else if (reportType === 'coach') {
      await renderCoachPDF(doc, data.coaches);
    } else if (reportType === 'financial') {
      await renderFinancialPDF(doc, data);
    }

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.moveTo(50, doc.page.height - 45)
        .lineTo(doc.page.width - 50, doc.page.height - 45)
        .stroke('#e5e7eb');
      doc.fontSize(8).fillColor('#6b7280')
        .text(`Halaman ${i + 1} dari ${pages.count}`, 50, doc.page.height - 35, { 
          align: 'center', 
          width: doc.page.width - 100 
        });
    }

    doc.end();
  } catch (error) {
    console.error('❌ Error PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error generating PDF' });
    }
  }
}


// ==================== PDF RENDER: STUDENT ====================
async function renderStudentPDF(doc, data) {
  let y = 125;

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
    .text('Kategori', 180, y + 4, { width: 35 })
    .text('Program', 220, y + 4, { width: 40 })
    .text('Pelatih', 265, y + 4, { width: 60 })
    .text('Kehadiran', 330, y + 4, { width: 35 })
    .text('Catatan', 370, y + 4, { width: 125 });

  y += 18;

  data.history.forEach((item, i) => {
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 50;
    }

    const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
    doc.rect(50, y, doc.page.width - 100, 14).fill(bgColor);

    doc.fillColor('#000').fontSize(5.5).font('Helvetica')
      .text(new Date(item.date).toLocaleDateString('id-ID'), 60, y + 2, { width: 40 })
      .text(item.time, 105, y + 2, { width: 35 })
      .text(item.scheduleType || '-', 145, y + 2, { width: 30 })
      .text(item.programCategory, 180, y + 2, { width: 35 })
      .text(item.program, 220, y + 2, { width: 40 })
      .text(item.coachNames, 265, y + 2, { width: 60 })
      .text(item.attendance, 330, y + 2, { width: 35 })
      .text(item.notes, 370, y + 2, { width: 125 });

    y += 14;
  });
}


// ==================== PDF RENDER: COACH ====================
async function renderCoachPDF(doc, coaches) {
  let y = 125;

  coaches.forEach(coach => {
    if (y > doc.page.height - 150) {
      doc.addPage();
      y = 50;
    }

    // Coach Header
    doc.roundedRect(50, y, doc.page.width - 100, 40, 5)
      .fillAndStroke('#f0fdf4', '#10b981');
    doc.fillColor('#10b981').fontSize(11).font('Helvetica-Bold')
      .text(`${coach.name} (${coach.id})`, 70, y + 8);
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
      .text(`Spesialisasi: ${coach.specialization}`, 70, y + 25)
      .text(`Total Sesi: ${coach.totalSessions}`, 400, y + 25);

    y += 50;

    // Schedule Type Stats
    if (coach.scheduleTypeStats.length > 0) {
      doc.fontSize(8).fillColor('#10b981').font('Helvetica-Bold')
        .text('📂 Statistik Schedule Type:', 60, y);
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
          .text(stat.typeKey, 60, y + 2, { width: 200 })
          .text(stat.total.toString(), 265, y + 2, { width: 35 })
          .text(stat.completed.toString(), 305, y + 2, { width: 35 })
          .text(stat.cancelled.toString(), 345, y + 2, { width: 35 });

        y += 12;
      });

      y += 8;
    }

    // Sessions
    if (coach.sessions.length > 0) {
      doc.fontSize(8).fillColor('#0369a1').font('Helvetica-Bold')
        .text('📋 Daftar Sesi & Evaluasi Siswa:', 60, y);
      y += 12;

      coach.sessions.forEach(session => {
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        // Session Header
        doc.rect(50, y, doc.page.width - 100, 14).fill('#e0f2fe');
        doc.fillColor('#0369a1').fontSize(6.5).font('Helvetica-Bold')
          .text(`${session.scheduleType} | ${new Date(session.date).toLocaleDateString('id-ID')} | ${session.time}`, 60, y + 3, { width: 300 })
          .text(`${session.programCategory}`, 380, y + 3, { width: 165 });

        y += 16;

        doc.fillColor('#000').fontSize(6).font('Helvetica')
          .text(`Program: ${session.program} | Lokasi: ${session.location}`, 60, y);
        y += 10;

        doc.fillColor('#0ea5e9').fontSize(6).font('Helvetica-Bold')
          .text(`Siswa: ${session.students}`, 60, y);
        y += 10;

        // Evaluations
        if (session.evaluations && session.evaluations.length > 0) {
          doc.rect(50, y, doc.page.width - 100, 12).fill('#10b981');
          doc.fillColor('#fff').fontSize(6).font('Helvetica-Bold')
            .text('Siswa', 60, y + 2, { width: 100 })
            .text('Kehadiran', 165, y + 2, { width: 50 })
            .text('Catatan', 220, y + 2, { width: 325 });

          y += 14;

          session.evaluations.forEach((athlete, aidx) => {
            if (y > doc.page.height - 40) {
              doc.addPage();
              y = 50;
            }

            const bgColor = aidx % 2 === 0 ? '#f9fafb' : '#ffffff';
            const noteLines = (athlete.notes || '').split('\\n').length || 1;
            const rowHeight = Math.max(12, noteLines * 8 + 2);

            doc.rect(50, y, doc.page.width - 100, rowHeight).fill(bgColor);

            doc.fillColor('#000').fontSize(5.5).font('Helvetica')
              .text(athlete.studentName, 60, y + 2, { width: 100 })
              .text(athlete.attendance, 165, y + 2, { width: 50 });

            doc.fillColor('#000').fontSize(5.5).font('Helvetica')
              .text(athlete.notes, 220, y + 2, { 
                width: 325,
                height: rowHeight - 4,
                align: 'left',
                ellipsis: false
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
async function renderFinancialPDF(doc, data) {
  let y = 125;

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
    if (y > doc.page.height - 40) {
      doc.addPage();
      y = 50;
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
  exportToExcelBeautiful
};
