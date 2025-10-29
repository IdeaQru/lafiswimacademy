// helpers/reportHelper.js

const Schedule = require('../models/Schedule');
const Coach = require('../models/Coach');
const Student = require('../models/Student');
const TrainingEvaluation = require('../models/TrainingEvaluation');
const Payment = require('../models/Payment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// ==================== DATA EXPORT HELPERS ====================

async function getStudentExportData(studentId, startDate, endDate) {
  try {
    const student = await Student.findOne({
      $or: [{ _id: studentId }, { studentId: studentId }]
    }).lean();

    if (!student) {
      throw new Error('Student not found');
    }

    const evalFilter = { studentId: student._id };
    if (startDate && endDate) {
      evalFilter.trainingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const evaluations = await TrainingEvaluation.find(evalFilter)
      .populate('coachId', 'fullName specialization')
      .populate('scheduleId')
      .sort({ trainingDate: -1 })
      .lean();

    const history = evaluations.map(evaluation => {
      const schedule = evaluation.scheduleId;
      return {
        date: evaluation.trainingDate,
        time: schedule ? `${schedule.startTime} - ${schedule.endTime}` : '-',
        location: schedule?.location || '-',
        program: schedule?.program || '-',
        coachName: evaluation.coachId?.fullName || '-',
        attendance: evaluation.attendance || 'Tidak Hadir',
        notes: evaluation.notes || '-'
      };
    });

    return { student, history };
  } catch (error) {
    console.error('Error in getStudentExportData:', error);
    throw error;
  }
}

async function getCoachExportData(startDate, endDate, coachId = null) {
  try {
    const scheduleFilter = {};
    
    if (startDate && endDate) {
      scheduleFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (coachId) {
      const coach = await Coach.findOne({ _id: coachId }).lean();
      if (coach) {
        scheduleFilter.coachId = coach._id;
        console.log(`🔍 Export filtering for coach: ${coach.fullName}`);
      }
    }

    const sessions = await Schedule.find(scheduleFilter)
      .populate('coachId', 'coachId fullName specialization')
      .populate('studentId', 'studentId fullName')
      .lean()
      .sort({ date: -1 })
      .limit(1000)
      .exec();

    const scheduleIds = sessions.map(s => s._id);
    
    const evaluations = await TrainingEvaluation
      .find({ scheduleId: { $in: scheduleIds } })
      .populate('studentId', 'studentId fullName classLevel')
      .lean()
      .exec();

    const evaluationMap = {};
    evaluations.forEach(evaluation => {
      const scheduleId = evaluation.scheduleId.toString();
      if (!evaluationMap[scheduleId]) {
        evaluationMap[scheduleId] = [];
      }
      evaluationMap[scheduleId].push({
        studentName: evaluation.studentId?.fullName || 'Unknown',
        studentId: evaluation.studentId?.studentId || '-',
        attendance: evaluation.attendance || 'Tidak Hadir',
        notes: evaluation.notes || '-'
      });
    });

    const coachMap = {};
    
    sessions.forEach(session => {
      const coachObjectId = session.coachId?._id?.toString();
      if (!coachObjectId) return;

      if (!coachMap[coachObjectId]) {
        coachMap[coachObjectId] = {
          coachName: session.coachId.fullName,
          coachId: session.coachId.coachId,
          specialization: session.coachId.specialization || '-',
          programStats: {},
          sessions: []
        };
      }

      const program = session.program || 'Unknown';
      if (!coachMap[coachObjectId].programStats[program]) {
        coachMap[coachObjectId].programStats[program] = {
          count: 0,
          completed: 0,
          cancelled: 0
        };
      }
      
      coachMap[coachObjectId].programStats[program].count++;
      
      if (session.status === 'completed') {
        coachMap[coachObjectId].programStats[program].completed++;
      } else if (session.status === 'cancelled') {
        coachMap[coachObjectId].programStats[program].cancelled++;
      }

      const sessionEvaluations = evaluationMap[session._id.toString()] || [];

      coachMap[coachObjectId].sessions.push({
        date: session.date,
        time: `${session.startTime} - ${session.endTime}`,
        location: session.location || '-',
        level: session.program || '-',
        status: session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Unknown',
        studentCount: sessionEvaluations.length || (session.studentId ? 1 : 0),
        students: session.studentId?.fullName || '-',
        scheduleNotes: session.notes || '-',
        evaluations: sessionEvaluations
      });
    });

    return { 
      coaches: Object.values(coachMap).map(coach => ({
        ...coach,
        totalSessions: coach.sessions.length,
        programStats: Object.keys(coach.programStats).map(program => ({
          program,
          totalSessions: coach.programStats[program].count,
          completedSessions: coach.programStats[program].completed,
          cancelledSessions: coach.programStats[program].cancelled
        })).sort((a, b) => b.totalSessions - a.totalSessions)
      }))
    };
  } catch (error) {
    console.error('Error in getCoachExportData:', error);
    throw error;
  }
}

async function getFinancialExportData(startDate, endDate) {
  try {
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
      totalRevenue,
      paidCount: payments.filter(p => p.status === 'paid').length,
      pendingCount: payments.filter(p => p.status === 'pending').length,
      averagePayment: payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0
    };

    return { 
      payments: payments.map(p => ({
        date: p.paymentDate,
        studentName: p.studentName || p.studentId?.fullName || 'Unknown',
        studentId: p.studentId?.studentId || '-',
        month: p.month || '-',
        amount: p.amount || 0,
        method: p.method || '-',
        status: p.status || 'unknown',
        notes: p.notes || '-'
      })),
      totalRevenue,
      stats
    };
  } catch (error) {
    console.error('Error in getFinancialExportData:', error);
    throw error;
  }
}

// ==================== PDF EXPORT ====================

async function exportToPDFBeautiful(res, title, data, reportType, startDate, endDate) {
  try {
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      bufferPages: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-${reportType}-${Date.now()}.pdf`);

    doc.pipe(res);

    // Header
    doc.rect(0, 0, doc.page.width, 110).fill('#0ea5e9');

    doc.fillColor('#ffffff')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('LAFI SWIMMING ACADEMY', 50, 25, { align: 'center' });

    doc.fontSize(16)
       .text(title, 50, 52, { align: 'center' });

    doc.fontSize(9)
       .font('Helvetica')
       .text(`Periode: ${startDate || 'Semua'} s/d ${endDate || 'Semua'}`, 50, 75, { align: 'center' });

    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, 50, 90, { align: 'center' });

    doc.moveDown(2);
    doc.fillColor('#000000');

    if (reportType === 'student-individual' && data.student) {
      await renderStudentIndividualPDF(doc, data);
    } else if (reportType === 'coach' && data.coaches) {
      await renderCoachPDF(doc, data.coaches);
    } else if (reportType === 'financial' && data.payments) {
      await renderFinancialPDF(doc, data.payments, data.totalRevenue, data.stats);
    }

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      doc.moveTo(50, doc.page.height - 45)
         .lineTo(doc.page.width - 50, doc.page.height - 45)
         .stroke('#e5e7eb');

      doc.fontSize(8)
         .fillColor('#6b7280')
         .text(
           `Halaman ${i + 1} dari ${pages.count}`,
           50,
           doc.page.height - 35,
           { align: 'center', width: doc.page.width - 100 }
         );

      doc.fontSize(7)
         .text('Lafi Swimming Academy - Sistem Manajemen Akademi Renang', 50, doc.page.height - 25, {
           align: 'center',
           width: doc.page.width - 100
         });
    }

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Error generating PDF report',
        error: error.message 
      });
    }
  }
}

// ==================== STUDENT INDIVIDUAL PDF ====================

async function renderStudentIndividualPDF(doc, data) {
  let y = 145;
  const PAGE_BOTTOM_MARGIN = 75;

  // Student info
  doc.roundedRect(50, y, doc.page.width - 100, 75, 5)
     .fillAndStroke('#f0f9ff', '#0ea5e9');

  doc.fillColor('#0ea5e9')
     .fontSize(13)
     .font('Helvetica-Bold')
     .text(`Siswa: ${data.student.fullName}`, 70, y + 12);

  doc.fontSize(9)
     .fillColor('#1e293b')
     .font('Helvetica')
     .text(`ID: ${data.student.studentId}`, 70, y + 30)
     .text(`Level: ${data.student.classLevel}`, 70, y + 43)
     .text(`Status: ${data.student.status}`, 70, y + 56)
     .text(`Total Sesi: ${data.history.length}`, 300, y + 43);

  y += 85;

  // Table header
  const renderTableHeader = (startY) => {
    doc.rect(50, startY, doc.page.width - 100, 18).fill('#0ea5e9');

    doc.fillColor('#ffffff')
       .fontSize(6.5)
       .font('Helvetica-Bold')
       .text('Tanggal', 60, startY + 5, { width: 58 })
       .text('Waktu', 123, startY + 5, { width: 43 })
       .text('Lokasi', 171, startY + 5, { width: 48 })
       .text('Pelatih', 224, startY + 5, { width: 63 })
       .text('Hadir', 292, startY + 5, { width: 48 })
       .text('Evaluasi', 345, startY + 5, { width: 190 });

    return startY + 20;
  };

  y = renderTableHeader(y);

  // Table rows
  data.history.forEach((item, i) => {
    const evalText = item.notes || '-';
    const evalWidth = 190;
    const fontSize = 6.5;
    const avgCharWidth = fontSize * 0.52;
    const charsPerLine = Math.floor(evalWidth / avgCharWidth);
    const lines = Math.ceil(evalText.length / charsPerLine);
    const lineHeight = 8.5;
    const textHeight = lines * lineHeight;
    const rowHeight = Math.max(16, textHeight + 4);

    if (y + rowHeight > doc.page.height - PAGE_BOTTOM_MARGIN) {
      doc.addPage();
      y = 50;
      y = renderTableHeader(y);
    }

    const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
    doc.rect(50, y, doc.page.width - 100, rowHeight).fill(bgColor);

    doc.strokeColor('#e5e7eb').lineWidth(0.3)
       .moveTo(123, y).lineTo(123, y + rowHeight)
       .moveTo(171, y).lineTo(171, y + rowHeight)
       .moveTo(224, y).lineTo(224, y + rowHeight)
       .moveTo(292, y).lineTo(292, y + rowHeight)
       .moveTo(345, y).lineTo(345, y + rowHeight)
       .stroke();

    const dateStr = item.date ? new Date(item.date).toLocaleDateString('id-ID') : '-';
    const centerY = rowHeight > 22 ? 4 : Math.max(4, (rowHeight - 9) / 2);

    doc.fillColor('#000000')
       .fontSize(6.5)
       .font('Helvetica');

    doc.text(dateStr, 60, y + centerY, { width: 58, ellipsis: true });
    doc.text(item.time, 123, y + centerY, { width: 43 });
    doc.text(item.location, 171, y + centerY, { width: 48, ellipsis: true });
    doc.text(item.coachName, 224, y + centerY, { width: 63, ellipsis: true });
    doc.text(item.attendance, 292, y + centerY, { width: 48 });

    doc.text(evalText, 345, y + 3, { 
      width: evalWidth,
      align: 'left',
      lineGap: 0
    });

    y += rowHeight;
  });

  if (data.history.length === 0) {
    doc.fontSize(9)
       .fillColor('#6b7280')
       .text('Belum ada riwayat latihan', 50, y + 12, { 
         align: 'center', 
         width: doc.page.width - 100 
       });
  }
}

// ==================== COACH PDF ====================

async function renderCoachPDF(doc, coaches) {
  let y = 145;
  const PAGE_BOTTOM_MARGIN = 75;

  coaches.forEach((coach) => {
    if (y > doc.page.height - 220) {
      doc.addPage();
      y = 50;
    }

    // Coach header
    doc.roundedRect(50, y, doc.page.width - 100, 42, 5)
       .fillAndStroke('#f0fdf4', '#10b981');

    doc.fillColor('#10b981')
       .fontSize(10.5)
       .font('Helvetica-Bold')
       .text(`${coach.coachName} (${coach.coachId})`, 70, y + 7);

    doc.fontSize(7.5)
       .fillColor('#6b7280')
       .font('Helvetica')
       .text(`Spesialisasi: ${coach.specialization}`, 70, y + 22)
       .text(`Total Sesi: ${coach.totalSessions}`, 400, y + 22);

    y += 50;

    // Program stats
    if (coach.programStats && coach.programStats.length > 0) {
      doc.fontSize(8.5)
         .fillColor('#10b981')
         .font('Helvetica-Bold')
         .text('Statistik Program:', 60, y);
      
      y += 14;

      doc.rect(50, y, doc.page.width - 100, 16).fill('#10b981');
      
      doc.fillColor('#ffffff')
         .fontSize(6.5)
         .font('Helvetica-Bold')
         .text('Program', 70, y + 4, { width: 170 })
         .text('Total', 250, y + 4, { width: 55 })
         .text('Selesai', 315, y + 4, { width: 55 })
         .text('Batal', 380, y + 4, { width: 55 });

      y += 18;

      coach.programStats.forEach((stat, i) => {
        const bgColor = i % 2 === 0 ? '#f0fdf4' : '#ffffff';
        doc.rect(50, y, doc.page.width - 100, 14).fill(bgColor);

        doc.fillColor('#000000')
           .fontSize(6.5)
           .font('Helvetica')
           .text(stat.program, 70, y + 3.5, { width: 170 })
           .text(stat.totalSessions.toString(), 250, y + 3.5, { width: 55 })
           .text(stat.completedSessions.toString(), 315, y + 3.5, { width: 55 })
           .text((stat.cancelledSessions || 0).toString(), 380, y + 3.5, { width: 55 });

        y += 14;
      });

      y += 8;
    }

    // Sessions
    coach.sessions.forEach((session, sessionIndex) => {
      if (y > doc.page.height - PAGE_BOTTOM_MARGIN) {
        doc.addPage();
        y = 50;
      }

      doc.rect(50, y, doc.page.width - 100, 18).fill('#e0f2fe');
      
      const sessionDate = session.date ? new Date(session.date).toLocaleDateString('id-ID') : '-';
      
      doc.fillColor('#0369a1')
         .fontSize(7.5)
         .font('Helvetica-Bold')
         .text(`Sesi ${sessionIndex + 1}: ${sessionDate} | ${session.time}`, 60, y + 5);

      y += 20;

      doc.fillColor('#000000')
         .fontSize(6.5)
         .font('Helvetica')
         .text(`Lokasi: ${session.location} | Program: ${session.level} | Status: ${session.status}`, 60, y);

      y += 13;

      if (session.evaluations && session.evaluations.length > 0) {
        doc.rect(50, y, doc.page.width - 100, 16).fill('#10b981');
        
        doc.fillColor('#ffffff')
           .fontSize(6.5)
           .font('Helvetica-Bold')
           .text('Siswa', 60, y + 4, { width: 115 })
           .text('Hadir', 180, y + 4, { width: 55 })
           .text('Catatan Evaluasi', 240, y + 4, { width: 295 });

        y += 18;

        session.evaluations.forEach((evalItem, i) => {
          const evalNotes = evalItem.notes || '-';
          const evalWidth = 295;
          const fontSize = 6.5;
          const avgCharWidth = fontSize * 0.52;
          const charsPerLine = Math.floor(evalWidth / avgCharWidth);
          const lines = Math.ceil(evalNotes.length / charsPerLine);
          const lineHeight = 7.5;
          const textHeight = lines * lineHeight;
          const rowHeight = Math.max(14, textHeight + 3);

          if (y + rowHeight > doc.page.height - PAGE_BOTTOM_MARGIN) {
            doc.addPage();
            y = 50;
          }

          const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
          doc.rect(50, y, doc.page.width - 100, rowHeight).fill(bgColor);

          doc.strokeColor('#e5e7eb').lineWidth(0.3)
             .moveTo(180, y).lineTo(180, y + rowHeight)
             .moveTo(240, y).lineTo(240, y + rowHeight)
             .stroke();

          const centerY = rowHeight > 18 ? 3.5 : Math.max(3.5, (rowHeight - 8) / 2);

          doc.fillColor('#000000')
             .fontSize(6)
             .font('Helvetica');

          doc.text(`${evalItem.studentName} (${evalItem.studentId})`, 60, y + centerY, { width: 115 });
          doc.text(evalItem.attendance, 180, y + centerY, { width: 55, align: 'center' });
          
          doc.text(evalNotes, 240, y + 2.5, { 
            width: evalWidth,
            align: 'left',
            lineGap: 0
          });

          y += rowHeight;
        });
      } else {
        doc.fillColor('#999999')
           .fontSize(6.5)
           .font('Helvetica-Oblique')
           .text('Belum ada evaluasi', 60, y);
        
        y += 13;
      }

      y += 8;
    });

    y += 18;
  });
}

// ==================== FINANCIAL PDF ====================

async function renderFinancialPDF(doc, payments, totalRevenue, stats) {
  let y = 145;
  const PAGE_BOTTOM_MARGIN = 75;

  doc.roundedRect(50, y, doc.page.width - 100, stats ? 75 : 55, 5)
     .fillAndStroke('#fef3c7', '#f59e0b');

  doc.fillColor('#f59e0b')
     .fontSize(13)
     .font('Helvetica-Bold')
     .text(`Total Pendapatan: Rp ${totalRevenue.toLocaleString('id-ID')}`, 70, y + 10);

  doc.fontSize(9)
     .fillColor('#6b7280')
     .font('Helvetica')
     .text(`Total Transaksi: ${payments.length}`, 70, y + 30);

  if (stats) {
    doc.text(`Lunas: ${stats.paidCount} | Pending: ${stats.pendingCount}`, 70, y + 45);
    doc.text(`Rata-rata: Rp ${stats.averagePayment.toLocaleString('id-ID')}`, 70, y + 60);
  }

  y += stats ? 85 : 65;

  const renderTableHeader = (startY) => {
    doc.rect(50, startY, doc.page.width - 100, 18).fill('#f59e0b');

    doc.fillColor('#ffffff')
       .fontSize(6.5)
       .font('Helvetica-Bold')
       .text('Tanggal', 60, startY + 5, { width: 65 })
       .text('Siswa', 130, startY + 5, { width: 95 })
       .text('Bulan', 230, startY + 5, { width: 55 })
       .text('Jumlah', 290, startY + 5, { width: 65 })
       .text('Metode', 360, startY + 5, { width: 55 })
       .text('Status', 420, startY + 5, { width: 55 });

    return startY + 20;
  };

  y = renderTableHeader(y);

  payments.forEach((payment, i) => {
    if (y > doc.page.height - PAGE_BOTTOM_MARGIN) {
      doc.addPage();
      y = 50;
      y = renderTableHeader(y);
    }

    const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
    doc.rect(50, y, doc.page.width - 100, 16).fill(bgColor);

    const dateStr = payment.date ? new Date(payment.date).toLocaleDateString('id-ID') : '-';

    doc.fillColor('#000000')
       .fontSize(6.5)
       .font('Helvetica')
       .text(dateStr, 60, y + 4, { width: 65 })
       .text(payment.studentName, 130, y + 4, { width: 95, ellipsis: true })
       .text(payment.month, 230, y + 4, { width: 55 })
       .text(`Rp ${payment.amount.toLocaleString('id-ID')}`, 290, y + 4, { width: 65 })
       .text(payment.method, 360, y + 4, { width: 55 })
       .text(payment.status, 420, y + 4, { width: 55 });

    y += 16;
  });

  if (payments.length === 0) {
    doc.fontSize(9)
       .fillColor('#6b7280')
       .text('Tidak ada data pembayaran', 50, y + 15, { align: 'center', width: doc.page.width - 100 });
  }
}

// ==================== EXCEL EXPORT ====================

async function exportToExcelBeautiful(res, title, data, reportType) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    };

    const wrapTextStyle = {
      alignment: { 
        vertical: 'top', 
        horizontal: 'left',
        wrapText: true
      }
    };

    if (reportType === 'student-individual' && data.student) {
      worksheet.columns = [
        { header: 'Tanggal', key: 'date', width: 12 },
        { header: 'Waktu', key: 'time', width: 12 },
        { header: 'Lokasi', key: 'location', width: 15 },
        { header: 'Program', key: 'program', width: 18 },
        { header: 'Pelatih', key: 'coachName', width: 20 },
        { header: 'Kehadiran', key: 'attendance', width: 12 },
        { header: 'Evaluasi', key: 'notes', width: 80 }
      ];

      worksheet.getRow(1).eachCell(cell => cell.style = headerStyle);

      worksheet.addRow({});
      worksheet.addRow({ date: 'Nama Siswa:', time: data.student.fullName });
      worksheet.addRow({ date: 'ID Siswa:', time: data.student.studentId });
      worksheet.addRow({ date: 'Level:', time: data.student.classLevel });
      worksheet.addRow({ date: 'Status:', time: data.student.status });
      worksheet.addRow({ date: 'Total Sesi:', time: data.history.length });
      worksheet.addRow({});

      const historyHeaderRow = worksheet.addRow({
        date: 'Tanggal',
        time: 'Waktu',
        location: 'Lokasi',
        program: 'Program',
        coachName: 'Pelatih',
        attendance: 'Kehadiran',
        notes: 'Evaluasi'
      });
      historyHeaderRow.eachCell(cell => cell.style = headerStyle);

      data.history.forEach(item => {
        const row = worksheet.addRow({
          date: item.date ? new Date(item.date).toLocaleDateString('id-ID') : '-',
          time: item.time,
          location: item.location,
          program: item.program,
          coachName: item.coachName,
          attendance: item.attendance,
          notes: item.notes
        });

        row.getCell('notes').style = wrapTextStyle;
        row.height = 30;
      });

    } else if (reportType === 'coach' && data.coaches) {
      worksheet.columns = [
        { header: 'Pelatih', key: 'coachName', width: 20 },
        { header: 'Tanggal', key: 'date', width: 12 },
        { header: 'Waktu', key: 'time', width: 12 },
        { header: 'Program', key: 'level', width: 18 },
        { header: 'Lokasi', key: 'location', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Siswa', key: 'studentName', width: 25 },
        { header: 'Kehadiran', key: 'attendance', width: 12 },
        { header: 'Catatan Evaluasi', key: 'evalNotes', width: 80 }
      ];

      worksheet.getRow(1).eachCell(cell => cell.style = headerStyle);

      data.coaches.forEach(coach => {
        coach.sessions.forEach(session => {
          if (session.evaluations && session.evaluations.length > 0) {
            session.evaluations.forEach(evalItem => {
              const row = worksheet.addRow({
                coachName: coach.coachName,
                date: session.date ? new Date(session.date).toLocaleDateString('id-ID') : '-',
                time: session.time,
                level: session.level,
                location: session.location,
                status: session.status,
                studentName: evalItem.studentName,
                attendance: evalItem.attendance,
                evalNotes: evalItem.notes
              });

              row.getCell('evalNotes').style = wrapTextStyle;
              row.height = 30;
            });
          } else {
            worksheet.addRow({
              coachName: coach.coachName,
              date: session.date ? new Date(session.date).toLocaleDateString('id-ID') : '-',
              time: session.time,
              level: session.level,
              location: session.location,
              status: session.status,
              studentName: session.students,
              attendance: '-',
              evalNotes: 'Belum ada evaluasi'
            });
          }
        });
      });

    } else if (reportType === 'financial' && data.payments) {
      worksheet.columns = [
        { header: 'Tanggal', key: 'date', width: 12 },
        { header: 'Siswa', key: 'studentName', width: 25 },
        { header: 'Bulan', key: 'month', width: 12 },
        { header: 'Jumlah', key: 'amount', width: 15 },
        { header: 'Metode', key: 'method', width: 12 },
        { header: 'Status', key: 'status', width: 12 }
      ];

      worksheet.getRow(1).eachCell(cell => cell.style = headerStyle);

      data.payments.forEach(p => {
        worksheet.addRow({
          date: p.date ? new Date(p.date).toLocaleDateString('id-ID') : '-',
          studentName: p.studentName,
          month: p.month,
          amount: p.amount,
          method: p.method,
          status: p.status
        });
      });

      const totalRow = worksheet.addRow({
        date: '',
        studentName: 'TOTAL',
        month: '',
        amount: data.totalRevenue,
        method: '',
        status: ''
      });
      totalRow.font = { bold: true };
      totalRow.getCell('amount').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' }
      };
      
      if (data.stats) {
        worksheet.addRow({});
        worksheet.addRow({ studentName: 'STATISTIK' }).font = { bold: true };
        worksheet.addRow({ studentName: 'Total Transaksi:', month: data.stats.totalPayments });
        worksheet.addRow({ studentName: 'Lunas:', month: data.stats.paidCount });
        worksheet.addRow({ studentName: 'Pending:', month: data.stats.pendingCount });
        worksheet.addRow({ studentName: 'Rata-rata:', amount: data.stats.averagePayment });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-${reportType}-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Error generating Excel report',
        error: error.message 
      });
    }
  }
}

module.exports = {
  getStudentExportData,
  getCoachExportData,
  getFinancialExportData,
  exportToPDFBeautiful,
  exportToExcelBeautiful
};
