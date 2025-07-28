// 전역 변수로 페이지 요소와 입력값 저장소 선언
const pages = {
    page1: document.getElementById('page1'),
    page2: document.getElementById('page2'),
    page3: document.getElementById('page3'),
};
let contractInfo = {};

// 페이지 전환 함수
function showPage(pageId) {
    Object.values(pages).forEach(page => page.classList.remove('active'));
    pages[pageId].classList.add('active');
    window.scrollTo(0, 0);
}

// 시간을 '자정부터 몇 분이 지났는지'로 변환
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// 분을 '시간' 단위로 변환
function minutesToHours(minutes) {
    return (minutes / 60).toFixed(2);
}

// 숫자 포맷 함수
function formatNumber(num) {
    return Math.round(num).toLocaleString('ko-KR');
}

// ==================== 페이지 1 로직 ====================
const annualSalaryInput = document.getElementById('annual-salary');
const contractStartTimeInput = document.getElementById('contract-start-time');
const contractEndTimeInput = document.getElementById('contract-end-time');
const breakStartTimeInput = document.getElementById('break-start-time');
const breakEndTimeInput = document.getElementById('break-end-time');

function saveContractInfo() {
    contractInfo = {
        salary: parseFloat(annualSalaryInput.value),
        workStart: contractStartTimeInput.value, workEnd: contractEndTimeInput.value,
        breakStart: breakStartTimeInput.value, breakEnd: breakEndTimeInput.value,
    };
    if (isNaN(contractInfo.salary) || contractInfo.salary <= 0) {
        alert("계약 연봉을 정확히 입력해주세요.");
        return false;
    }
    const hourlyWage = (contractInfo.salary / 12) / 209;
    contractInfo.hourlyWage = hourlyWage;
    return true;
}

document.getElementById('goto-page2').addEventListener('click', () => {
    if (saveContractInfo()) {
        document.getElementById('display-salary-p2').textContent = `${formatNumber(contractInfo.salary)} 원`;
        document.getElementById('display-work-time-p2').textContent = `${contractInfo.workStart} ~ ${contractInfo.workEnd}`;
        showPage('page2');
    }
});
document.getElementById('goto-page3').addEventListener('click', () => {
    if (saveContractInfo()) {
        document.getElementById('display-salary-p3').textContent = `${formatNumber(contractInfo.salary)} 원`;
        document.getElementById('display-hourly-wage-p3').textContent = `${formatNumber(contractInfo.hourlyWage)} 원`;
        showPage('page3');
    }
});


// ==================== 페이지 2 로직 (업그레이드) ====================
document.getElementById('calculate-daily-hours').addEventListener('click', () => {
    const workdayType = document.querySelector('input[name="workday-type"]:checked').value;
    const realStart = timeToMinutes(document.getElementById('real-start-time').value);
    let realEnd = timeToMinutes(document.getElementById('real-end-time').value);
    if (realEnd < realStart) realEnd += 24 * 60;
    
    const totalBreakMinutes = (parseFloat(document.getElementById('extra-break-hours').value) || 0) * 60;
    
    let totalMinutesWorked = realEnd - realStart - totalBreakMinutes;
    if (totalMinutesWorked < 0) totalMinutesWorked = 0;

    let results = {};
    if (workdayType === 'weekday') {
        results = calculateWeekdayOvertime(realStart, realEnd, totalBreakMinutes);
    } else {
        results = calculateHolidayOvertime(totalMinutesWorked, realStart, realEnd);
    }
    
    displayDailyResults(results);
});

function calculateWeekdayOvertime(start, end, breakMinutes) {
    const contractStart = timeToMinutes(contractInfo.workStart);
    const contractEnd = timeToMinutes(contractInfo.workEnd);
    const lunchStart = timeToMinutes(contractInfo.breakStart);
    const lunchEnd = timeToMinutes(contractInfo.breakEnd);

    let weekdayOvertime = 0;
    let nightOvertime = 0;

    for (let minute = start; minute < end; minute++) {
        const isLunchBreak = minute >= lunchStart && minute < lunchEnd;
        if (isLunchBreak) continue;
        
        const isRegularWork = minute >= contractStart && minute < contractEnd;
        if (isRegularWork) continue;

        const currentMinuteInDay = minute % (24 * 60);
        const isNight = currentMinuteInDay >= 22 * 60 || currentMinuteInDay < 6 * 60;

        if (isNight) nightOvertime++;
        else weekdayOvertime++;
    }
    
    const totalOvertime = weekdayOvertime + nightOvertime;
    // 평일은 추가 휴게시간만큼 연장근로에서 차감
    const netWeekdayOvertime = Math.max(0, weekdayOvertime - breakMinutes);

    return {
        weekday: netWeekdayOvertime,
        night: nightOvertime,
        holiday: 0,
        holidayOver: 0,
        holidayNight: 0
    };
}

function calculateHolidayOvertime(totalMinutes, start, end) {
    let holiday_basic = Math.min(totalMinutes, 8 * 60);
    let holiday_over = Math.max(0, totalMinutes - 8 * 60);
    let holiday_night = 0;

    for (let minute = start; minute < end; minute++) {
        const currentMinuteInDay = minute % (24 * 60);
        const isNight = currentMinuteInDay >= 22 * 60 || currentMinuteInDay < 6 * 60;
        if (isNight) holiday_night++;
    }

    return {
        weekday: 0,
        night: 0,
        holiday: holiday_basic,
        holidayOver: holiday_over,
        holidayNight: holiday_night
    };
}

function displayDailyResults(results) {
    const { weekday, night, holiday, holidayOver, holidayNight } = results;
    const h = minutesToHours; // 단축
    
    let breakdownHTML = '';
    let totalPay = 0;
    const hourlyWage = contractInfo.hourlyWage;

    if (weekday > 0 || night > 0) {
        const weekdayPay = (weekday / 60) * hourlyWage * 1.5;
        const nightPay = (night / 60) * hourlyWage * 2.0;
        totalPay = weekdayPay + nightPay;
        breakdownHTML = `
            <div class="breakdown-item"><span>평일 연장근무</span><span>${h(weekday)} 시간</span></div>
            <div class="breakdown-item"><span>평일 야간근무</span><span>${h(night)} 시간</span></div>
        `;
    } else {
        const holidayPay = (holiday / 60) * hourlyWage * 1.5;
        const holidayOverPay = (holidayOver / 60) * hourlyWage * 2.0;
        const holidayNightPay = (holidayNight / 60) * hourlyWage * 2.5;
        totalPay = holidayPay + holidayOverPay + holidayNightPay;
        breakdownHTML = `
            <div class="breakdown-item"><span>휴일근무 (8h 이내)</span><span>${h(holiday)} 시간</span></div>
            <div class="breakdown-item"><span>휴일근무 (8h 초과)</span><span>${h(holidayOver)} 시간</span></div>
            <div class="breakdown-item"><span>휴일야간근무</span><span>${h(holidayNight)} 시간</span></div>
        `;
    }
    
    document.getElementById('daily-hours-breakdown').innerHTML = breakdownHTML;
    document.getElementById('total-daily-pay').textContent = `${formatNumber(totalPay)} 원`;
    document.getElementById('daily-result-section').classList.remove('hidden');
}

// ==================== 페이지 3 로직 ====================
document.getElementById('calculate-monthly-pay').addEventListener('click', () => {
    const hourlyWage = contractInfo.hourlyWage;
    
    const weekdayHours = parseFloat(document.getElementById('total-ot-weekday').value) || 0;
    const nightHours = parseFloat(document.getElementById('total-ot-night').value) || 0;
    const holidayHours = parseFloat(document.getElementById('total-ot-holiday').value) || 0;
    const holidayOverHours = parseFloat(document.getElementById('total-ot-holiday-over').value) || 0;
    const holidayNightHours = parseFloat(document.getElementById('total-ot-holiday-night').value) || 0;

    const weekdayPay = weekdayHours * hourlyWage * 1.5;
    const nightPay = nightHours * hourlyWage * 2.0;
    const holidayPay = holidayHours * hourlyWage * 1.5;
    const holidayOverPay = holidayOverHours * hourlyWage * 2.0;
    const holidayNightPay = holidayNightHours * hourlyWage * 2.5;
    const totalPay = weekdayPay + nightPay + holidayPay + holidayOverPay + holidayNightPay;

    document.getElementById('result-monthly-weekday').textContent = `${formatNumber(weekdayPay)} 원`;
    document.getElementById('result-monthly-night').textContent = `${formatNumber(nightPay)} 원`;
    document.getElementById('result-monthly-holiday').textContent = `${formatNumber(holidayPay)} 원`;
    document.getElementById('result-monthly-holiday-over').textContent = `${formatNumber(holidayOverPay)} 원`;
    document.getElementById('result-monthly-holiday-night').textContent = `${formatNumber(holidayNightPay)} 원`;
    document.getElementById('total-monthly-pay').textContent = `${formatNumber(totalPay)} 원`;

    document.getElementById('monthly-result-section').classList.remove('hidden');
});

// ==================== 뒤로가기 버튼 로직 ====================
document.querySelectorAll('.back-button').forEach(button => {
    button.addEventListener('click', (e) => showPage(e.target.dataset.target));
});