        // --- DATA BANKS WITH SEMESTER CATEGORIZATION ---
        // To add a course to the second semester later, simply add a new object here with `semester: 'second'`
        const courses = {
            'cos': { name: 'COS 101', title: 'Introduction to Computer Science', semester: 'first', questions: cosQuestions },
            'phy': { name: 'PHY 101', title: 'General Physics I', semester: 'first', questions: phyQuestions },
            'csc': { name: 'CSC 111', title: 'Introduction to Database Concept', semester: 'first', questions: cscQuestions },
            'gns113': {name: 'GNS 113', title: 'Use of Library', semester: 'first', questions: gns113Questions },
            
            'vos': { name: 'VOS 114', title: 'Computer Maintance And Percaution', semester: 'vocational', questions: vosQuestuons },
            'vos117': {name: 'VOS 117', title: 'Fish Farming', semester: 'vocational', questions: vos117Questions }
            
            // Example of adding a second semester course in the future:
            // 'mth102': { name: 'MTH 102', title: 'Calculus II', semester: 'second', questions: mth102Questions }
        };

        // --- STATE VARIABLES ---
        let userName = "";
        let selectedSemester = null;
        let selectedCourse = null;
        let selectedCount = 30;
        let timeRemaining = 0;
        let timerInterval = null;
        let activeQuestions = [];
        let currentIndex = 0;
        let userAnswers = {};
        let flaggedQuestions = new Set();
        let waVanishTimer = null;
        let calcValue = '0';
        let calcOp = null;
        let calcWait = false;
        
        let pdfConfirmWait = false;
        let pdfResetTimer = null;
        let currentResultView = null; 

        // Sound System
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        let audioCtx;

        function initAudio() {
            if (!audioCtx) audioCtx = new AudioContext();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        }

        function playTone(freq, type, duration, vol=0.1) {
            if(!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        }

        function playTick() { playTone(800, 'sine', 0.1, 0.05); }
        function playBuzzer() { playTone(150, 'sawtooth', 0.5, 0.2); }
        function playCheer() {
            [440, 554, 659, 880].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.2, 0.1), i*120));
        }

        // --- DOM ELEMENTS ---
        const screens = {
            landing: document.getElementById('landing-screen'),
            welcome: document.getElementById('welcome-screen'),
            login: document.getElementById('login-screen'),
            semester: document.getElementById('semester-screen'),
            course: document.getElementById('course-screen'),
            setup: document.getElementById('setup-screen'),
            quiz: document.getElementById('quiz-screen'),
            results: document.getElementById('results-screen')
        };
        const warningModal = document.getElementById('warning-modal');
        const waButton = document.getElementById('wa-button');

        // --- LOGIC & FUNCTIONS ---
        function toggleDarkMode() {
            const html = document.documentElement;
            html.classList.toggle('dark');
            const isDark = html.classList.contains('dark');
            document.getElementById('theme-toggle-light-icon').classList.toggle('hidden', !isDark);
            document.getElementById('theme-toggle-dark-icon').classList.toggle('hidden', isDark);
        }

        function switchScreen(screenName) {
            Object.values(screens).forEach(s => {
                s.classList.add('hidden');
                s.classList.remove('screen-enter');
            });
            screens[screenName].classList.remove('hidden');
            void screens[screenName].offsetWidth;
            screens[screenName].classList.add('screen-enter');
            
            // Show calc button only in quiz screen AND only for PHY 101
            if(screenName === 'quiz' && selectedCourse === 'phy') {
                document.getElementById('calc-trigger-btn').classList.remove('hidden');
            } else {
                document.getElementById('calc-trigger-btn').classList.add('hidden');
                document.getElementById('calculator-modal').classList.add('hidden');
            }
        }

        function shuffle(array) {
            let currentIndex = array.length, randomIndex;
            while (currentIndex != 0) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;
                [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
            }
            return array;
        }

        function formatTime(seconds) {
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        }

        function showWhatsApp(temporary = false) {
            waButton.classList.remove('hidden');
            waButton.classList.add('wa-animate-in');
            if (waVanishTimer) clearTimeout(waVanishTimer);
            if (temporary) {
                waVanishTimer = setTimeout(() => hideWhatsApp(), 120000);
            }
        }

        function hideWhatsApp() {
            waButton.classList.add('hidden');
            waButton.classList.remove('wa-animate-in');
            if (waVanishTimer) clearTimeout(waVanishTimer);
        }

        // --- EVENT LISTENERS ---

        function handleWelcomeStart() {
            initAudio();
            switchScreen('login');
            showWhatsApp(true); 
        }

        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('student-name').value.trim();
            if (nameInput) {
                userName = nameInput;
                document.getElementById('course-display-name').textContent = userName;
                switchScreen('semester');
            }
        });

        // Dynamic Semester and Course Handling
        function selectSemester(semester) {
            selectedSemester = semester;
            renderCourses();
            switchScreen('course');
        }

        function renderCourses() {
            const container = document.getElementById('course-list-container');
            container.innerHTML = '';
            
            let coursesFound = false;

            for (const [key, course] of Object.entries(courses)) {
                if (course.semester === selectedSemester) {
                    coursesFound = true;
                    
                    let colorTheme = "purple";
                    if(selectedSemester === 'second') colorTheme = "blue";
                    if(selectedSemester === 'vocational') colorTheme = "emerald";

                    const buttonHtml = `
                        <button onclick="selectCourse('${key}')" class="w-full text-left p-5 rounded-2xl border border-white/60 dark:border-white/10 bg-white/30 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-white/10 hover:border-${colorTheme}-300 dark:hover:border-${colorTheme}-500 backdrop-blur-md shadow-sm hover:shadow-md transition-all group">
                            <div class="flex justify-between items-center">
                                <div>
                                    <h3 class="text-xl font-bold text-slate-800 group-hover:text-${colorTheme}-700 dark:group-hover:text-${colorTheme}-400 transition-colors">${course.name}</h3>
                                    <p class="text-slate-500 mt-1 text-sm font-medium">${course.title}</p>
                                </div>
                                <span class="bg-${colorTheme}-100/50 dark:bg-${colorTheme}-900/50 border border-${colorTheme}-200 dark:border-${colorTheme}-700 text-${colorTheme}-800 dark:text-${colorTheme}-300 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">${course.questions.length} Qs Available</span>
                            </div>
                        </button>
                    `;
                    container.innerHTML += buttonHtml;
                }
            }

            if (!coursesFound) {
                container.innerHTML = `
                    <div class="p-8 rounded-2xl border border-white/60 dark:border-white/10 bg-white/30 dark:bg-black/20 text-center backdrop-blur-md">
                        <svg class="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">No Courses Available</h3>
                        <p class="text-slate-500 text-sm">There are currently no courses uploaded for this semester. Please check back later.</p>
                    </div>
                `;
            }
        }

        function selectCourse(courseKey) {
            selectedCourse = courseKey;
            selectedCount = 30;
            const courseName = courses[courseKey].name;
            document.getElementById('setup-course-title').textContent = courseName + " - " + courses[courseKey].title;
            document.getElementById('setup-time-header').textContent = `Time Limit (${courseName})`;
            renderCountOptions();
            updateWarningText();
            switchScreen('setup');
        }

        function renderCountOptions() {
            const container = document.getElementById('question-count-buttons');
            container.innerHTML = '';
            
            let maxAvailable = courses[selectedCourse].questions.length;
            let options = [];
            
            if (maxAvailable >= 10) options.push(10);
            if (maxAvailable >= 30) options.push(30);
            if (maxAvailable >= 50) options.push(50);
            if (maxAvailable >= 100) options.push(100);
            if (selectedCourse === 'phy' && maxAvailable >= 150) options.push(150);

            if (!options.includes(selectedCount)) {
                selectedCount = options[0] || maxAvailable;
            }

            options.forEach(num => {
                const isSelected = num === selectedCount;
                const btn = document.createElement('button');
                btn.type = 'button';
                
                if (isSelected) {
                    btn.className = "py-4 rounded-2xl border-2 font-bold transition-all border-purple-400 bg-purple-500/10 text-purple-900 dark:text-purple-300 shadow-inner backdrop-blur-md";
                } else {
                    btn.className = "py-4 rounded-2xl border border-white/50 dark:border-white/10 bg-white/30 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold hover:bg-white/50 dark:hover:bg-white/10 hover:border-white/70 dark:hover:border-white/20 hover:shadow-sm transition-all backdrop-blur-md";
                }

                btn.textContent = num;
                btn.onclick = () => {
                    selectedCount = num;
                    renderCountOptions();
                    updateWarningText();
                };
                container.appendChild(btn);
            });
        }

        function updateWarningText() {
            const warning = document.getElementById('time-warning-text');
            if (selectedCount === 10) warning.textContent = "You will have exactly 3 minutes to complete 10 questions.";
            if (selectedCount === 30) warning.textContent = "You will have exactly 7 minutes to complete 30 questions.";
            if (selectedCount === 50) warning.textContent = "You will have exactly 10 minutes to complete 50 questions.";
            if (selectedCount === 100) warning.textContent = "You will have exactly 20 minutes to complete 100 questions.";
            if (selectedCount === 150) warning.textContent = "You will have exactly 30 minutes to complete 150 questions.";
        }

        // TIMER LOGIC EXTRACTED FOR REUSE
        function startTimerLogic() {
            hideWhatsApp(); 
            
            let minutes = 3;
            if (selectedCount === 30) minutes = 7;
            if (selectedCount === 50) minutes = 10;
            if (selectedCount === 100) minutes = 20;
            if (selectedCount === 150) minutes = 30;

            timeRemaining = minutes * 60;
            
            document.getElementById('course-badge').textContent = courses[selectedCourse].name;
            buildNavGrid();
            renderQuestion();
            updateProgress();
            switchScreen('quiz');

            const timerDisplay = document.getElementById('timer-display');
            const timeText = document.getElementById('time-remaining');
            timeText.textContent = formatTime(timeRemaining);
            
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                timeRemaining--;
                timeText.textContent = formatTime(timeRemaining);
                
                if (timeRemaining <= 60 && timeRemaining > 0) {
                    timerDisplay.className = "flex items-center font-mono font-bold text-lg px-4 py-2 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-800 dark:text-rose-400 animate-pulse shadow-sm backdrop-blur-md transition-colors duration-300";
                    if(timeRemaining % 2 === 0) playTick(); 
                } else if (timeRemaining > 60) {
                    timerDisplay.className = "flex items-center font-mono font-bold text-lg px-4 py-2 rounded-2xl bg-white/40 dark:bg-white/10 border border-white/50 dark:border-white/10 text-slate-800 shadow-sm backdrop-blur-md transition-colors duration-300";
                }

                if (timeRemaining <= 0) {
                    clearInterval(timerInterval);
                    forceSubmit();
                }
            }, 1000);
        }

        document.getElementById('start-quiz-btn').addEventListener('click', () => {
            let sourceQuestions = courses[selectedCourse].questions;
            let shuffled = shuffle([...sourceQuestions]);
            activeQuestions = shuffled.slice(0, selectedCount);
            
            currentIndex = 0;
            userAnswers = {};
            flaggedQuestions.clear();
            
            startTimerLogic();
        });

        // RETAKE EXACT TEST FUNCTION
        function retakeExactTest() {
            // Keep activeQuestions as they are, just reset the user data
            currentIndex = 0;
            userAnswers = {};
            flaggedQuestions.clear();
            
            document.getElementById('review-section').classList.add('hidden');
            document.getElementById('toggle-review-btn').textContent = "Show Detailed Review";
            
            startTimerLogic();
        }

        function buildNavGrid() {
            const grid = document.getElementById('nav-grid');
            grid.innerHTML = '';
            for(let i=0; i<selectedCount; i++) {
                const btn = document.createElement('button');
                btn.id = `nav-btn-${i}`;
                btn.textContent = i + 1;
                btn.className = "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl font-bold text-xs sm:text-sm transition-all border snap-center cursor-pointer";
                btn.onclick = () => {
                    currentIndex = i;
                    renderQuestion();
                };
                grid.appendChild(btn);
            }
            updateGridColors();
        }

        function updateGridColors() {
            for(let i=0; i<selectedCount; i++) {
                const btn = document.getElementById(`nav-btn-${i}`);
                if(!btn) continue;
                
                let baseClass = "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl font-bold text-xs sm:text-sm transition-all border snap-center cursor-pointer ";
                
                if(i === currentIndex) {
                    baseClass += "ring-2 ring-purple-500 scale-110 ";
                    btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }

                if(flaggedQuestions.has(i)) {
                    baseClass += "bg-yellow-100 dark:bg-yellow-900/50 border-yellow-400 text-yellow-700 dark:text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.5)]";
                } else if(userAnswers[i] !== undefined) {
                    baseClass += "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-400 text-emerald-700 dark:text-emerald-400";
                } else {
                    baseClass += "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 opacity-70";
                }
                
                btn.className = baseClass;
            }
        }

        function updateProgress() {
            const answeredCount = Object.keys(userAnswers).length;
            const percentage = (answeredCount / selectedCount) * 100;
            document.getElementById('quiz-progress-bar').style.width = `${percentage}%`;
        }

        function toggleFlag() {
            if(flaggedQuestions.has(currentIndex)) {
                flaggedQuestions.delete(currentIndex);
            } else {
                flaggedQuestions.add(currentIndex);
            }
            renderQuestion(); 
            updateGridColors();
        }

        function renderQuestion() {
            const q = activeQuestions[currentIndex];
            
            document.getElementById('progress-text').textContent = `Q ${currentIndex + 1} / ${selectedCount}`;
            document.getElementById('question-text').textContent = `${currentIndex + 1}. ${q.q}`;
            
            const optsContainer = document.getElementById('options-container');
            optsContainer.innerHTML = '';
            
            q.opts.forEach((opt, idx) => {
                const isSelected = userAnswers[currentIndex] === idx;
                const letter = String.fromCharCode(65 + idx);
                const btn = document.createElement('button');
                
                if (isSelected) {
                    btn.className = "w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center border-purple-400 bg-purple-500/10 shadow-sm backdrop-blur-md";
                } else {
                    btn.className = "w-full text-left p-5 rounded-2xl border transition-all flex items-center border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10 hover:border-white/60 dark:hover:border-white/20 hover:shadow-sm backdrop-blur-md";
                }

                btn.onclick = () => {
                    if (btn.disabled) return; 

                    userAnswers[currentIndex] = idx;
                    updateProgress();
                    updateGridColors();
                    renderQuestion(); 

                    if (currentIndex < activeQuestions.length - 1) {
                        const allOpts = document.querySelectorAll('#options-container button');
                        allOpts.forEach(b => b.disabled = true);

                        setTimeout(() => {
                            currentIndex++;
                            renderQuestion();
                        }, 400); 
                    }
                };
                
                const letterBadgeClass = isSelected 
                    ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-md border-transparent" 
                    : "bg-white/50 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-white/60 dark:border-white/10";

                btn.innerHTML = `
                    <span class="w-10 h-10 rounded-full flex items-center justify-center font-bold mr-5 flex-shrink-0 ${letterBadgeClass} transition-colors">${letter}</span>
                    <span class="text-base sm:text-lg ${isSelected ? 'text-purple-900 dark:text-purple-300 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium'}">${opt}</span>
                `;
                optsContainer.appendChild(btn);
            });

            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            const submitBtn = document.getElementById('submit-btn');
            const flagBtn = document.getElementById('flag-btn');

            if (currentIndex === 0) {
                prevBtn.disabled = true;
                prevBtn.className = "flex items-center justify-center px-4 py-3 sm:px-5 sm:py-4 rounded-2xl font-bold transition-all flex-1 sm:flex-none bg-white/10 border border-white/20 text-slate-400 cursor-not-allowed backdrop-blur-md";
            } else {
                prevBtn.disabled = false;
                prevBtn.className = "flex items-center justify-center px-4 py-3 sm:px-5 sm:py-4 rounded-2xl font-bold transition-all flex-1 sm:flex-none bg-white/40 dark:bg-white/10 border border-white/50 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/20 hover:shadow-sm backdrop-blur-md";
            }

            if(flaggedQuestions.has(currentIndex)) {
                flagBtn.classList.add('bg-yellow-400', 'text-yellow-900', 'border-yellow-500');
                flagBtn.classList.remove('bg-yellow-100/50', 'text-yellow-700');
            } else {
                flagBtn.classList.remove('bg-yellow-400', 'text-yellow-900', 'border-yellow-500');
                flagBtn.classList.add('bg-yellow-100/50', 'text-yellow-700');
            }

            if (currentIndex === activeQuestions.length - 1) {
                nextBtn.classList.add('hidden');
                submitBtn.classList.remove('hidden');
            } else {
                nextBtn.classList.remove('hidden');
                submitBtn.classList.add('hidden');
            }

            updateGridColors();
        }

        document.getElementById('prev-btn').addEventListener('click', () => {
            if (currentIndex > 0) { currentIndex--; renderQuestion(); }
        });
        document.getElementById('next-btn').addEventListener('click', () => {
            if (currentIndex < activeQuestions.length - 1) { currentIndex++; renderQuestion(); }
        });

        document.getElementById('submit-btn').addEventListener('click', () => {
            const answeredCount = Object.keys(userAnswers).length;
            const unanswered = selectedCount - answeredCount;
            
            if (unanswered > 0) {
                document.getElementById('unanswered-count').textContent = unanswered;
                warningModal.classList.remove('hidden');
            } else {
                forceSubmit();
            }
        });

        function closeModal() {
            warningModal.classList.add('hidden');
        }

        // TOGGLE REVIEW BUTTON
        function toggleReview() {
            const revSec = document.getElementById('review-section');
            const btn = document.getElementById('toggle-review-btn');
            if (revSec.classList.contains('hidden')) {
                revSec.classList.remove('hidden');
                btn.textContent = "Hide Detailed Review";
                revSec.scrollIntoView({ behavior: 'smooth' });
            } else {
                revSec.classList.add('hidden');
                btn.textContent = "Show Detailed Review";
            }
        }

        function renderResultsView(rName, rCourse, rScore, rTotal, rQuestions, rAnswers, rPassed) {
            currentResultView = { name: rName, course: rCourse, score: rScore, total: rTotal, questions: rQuestions, answers: rAnswers, passed: rPassed };
            
            const percentage = Math.round((rScore / rTotal) * 100);

            document.getElementById('result-name').textContent = rName;
            document.getElementById('result-course-text').textContent = rCourse + " Assessment";
            document.getElementById('score-correct').textContent = rScore;
            document.getElementById('score-total').textContent = rTotal;
            
            const percEl = document.getElementById('score-percentage');
            percEl.textContent = `${percentage}%`;
            percEl.className = `text-4xl sm:text-5xl font-black ${rPassed ? 'text-emerald-600' : 'text-rose-600'}`;
            
            const barEl = document.getElementById('result-bar');
            barEl.className = `absolute top-0 left-0 w-full h-2 backdrop-blur-md ${rPassed ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`;

            const iconEl = document.getElementById('award-icon');
            iconEl.className = `w-12 h-12 relative z-10 ${rPassed ? 'text-emerald-500' : 'text-rose-500'}`;
            
            const glowEl = document.getElementById('result-glow');
            glowEl.className = `absolute inset-0 rounded-full blur-md opacity-50 mix-blend-multiply ${rPassed ? 'bg-emerald-300' : 'bg-rose-300'}`;

            const msgEl = document.getElementById('pass-fail-msg');
            msgEl.textContent = rPassed 
                ? 'Exceptional Work! You Passed. Brilliant! You deserve a new gadget.' 
                : 'Keep studying! You failed this time. Don\'t give up! Join our tutorial group to ace it next time.';
            msgEl.className = `inline-block px-8 py-3 rounded-full font-bold text-sm sm:text-lg backdrop-blur-xl shadow-sm border ${rPassed ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-400/50' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-400/50'}`;

            const reviewContainer = document.getElementById('review-container');
            reviewContainer.innerHTML = '';
            
            rQuestions.forEach((q, qIdx) => {
                const userAns = rAnswers[qIdx];
                const isCorrect = userAns === q.ans;
                const isUnanswered = userAns === undefined;

                let optsHtml = '';
                q.opts.forEach((opt, optIdx) => {
                    const isThisCorrectOpt = optIdx === q.ans;
                    const isThisUserOpt = optIdx === userAns;
                    
                    let optClass = "p-3.5 rounded-2xl border backdrop-blur-md ";
                    if (isThisCorrectOpt) optClass += "border-emerald-400 bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 font-bold shadow-sm ";
                    else if (isThisUserOpt && !isCorrect) optClass += "border-rose-400 bg-rose-500/20 text-rose-900 dark:text-rose-300 font-bold ";
                    else optClass += "border-white/30 dark:border-white/10 bg-white/10 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-medium ";

                    optsHtml += `
                        <div class="${optClass}">
                            <span class="mr-2 opacity-70">${String.fromCharCode(65 + optIdx)}.</span> ${opt}
                        </div>
                    `;
                });

                const iconSvg = isCorrect 
                    ? `<div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg></div>`
                    : `<div class="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900 border border-rose-300 flex items-center justify-center text-rose-600 dark:text-rose-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></div>`;

                const blockClass = `p-5 sm:p-6 rounded-3xl border backdrop-blur-lg shadow-sm ${isCorrect ? 'bg-emerald-500/5 border-emerald-300/50' : 'bg-rose-500/5 border-rose-300/50'}`;

                const blockHtml = `
                    <div class="${blockClass}">
                        <div class="flex items-start">
                            <div class="mt-0.5 mr-4 flex-shrink-0">${iconSvg}</div>
                            <div class="w-full">
                                <p class="font-bold text-slate-800 dark:text-slate-200 mb-5 text-lg leading-snug">${qIdx + 1}. ${q.q}</p>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    ${optsHtml}
                                </div>
                                ${isUnanswered ? `<p class="text-rose-700 dark:text-rose-400 text-sm font-bold mt-4 bg-rose-500/20 border border-rose-400/50 inline-block px-3 py-1.5 rounded-lg backdrop-blur-md">You did not answer this question</p>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                reviewContainer.innerHTML += blockHtml;
            });

            // Ensure review is hidden by default when page is loaded
            document.getElementById('review-section').classList.add('hidden');
            document.getElementById('toggle-review-btn').textContent = "Show Detailed Review";

            switchScreen('results');
        }

        function forceSubmit() {
            clearInterval(timerInterval);
            warningModal.classList.add('hidden');
            document.getElementById('calculator-modal').classList.add('hidden');
            document.getElementById('calc-trigger-btn').classList.add('hidden');
            
            let score = 0;
            activeQuestions.forEach((q, idx) => {
                if (userAnswers[idx] === q.ans) score++;
            });
            
            const passed = (score / selectedCount) >= 0.5;

            if(passed) playCheer();
            else playBuzzer();

            const history = JSON.parse(localStorage.getItem('horlyTechHistory') || '[]');
            history.push({
                date: new Date().toLocaleDateString(),
                name: userName,
                course: courses[selectedCourse].name,
                score: score,
                total: selectedCount,
                passed: passed,
                questions: activeQuestions, 
                answers: userAnswers        
            });
            localStorage.setItem('horlyTechHistory', JSON.stringify(history));

            renderResultsView(userName, courses[selectedCourse].name, score, selectedCount, activeQuestions, userAnswers, passed);
            showWhatsApp(false); 
        }

        // --- HISTORY FUNCTIONALITY ---
        function showHistory() {
            const history = JSON.parse(localStorage.getItem('horlyTechHistory') || '[]');
            const container = document.getElementById('history-container');
            container.innerHTML = '';
            
            if(history.length === 0) {
                container.innerHTML = '<p class="text-slate-500 text-center py-4">No past results found.</p>';
            } else {
                history.slice().reverse().forEach((entry, idx) => {
                    const originalIndex = history.length - 1 - idx;
                    const pct = Math.round((entry.score/entry.total)*100);
                    
                    const hasDetails = entry.questions && entry.answers;
                    
                    container.innerHTML += `
                        <div class="bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 p-4 rounded-xl shadow-sm mb-3">
                            <div class="flex justify-between items-center mb-2">
                                <div>
                                    <p class="font-bold text-slate-800 dark:text-white">${entry.course}</p>
                                    <p class="text-xs text-slate-500">${entry.date} - ${entry.name}</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-black ${entry.passed ? 'text-emerald-500' : 'text-rose-500'}">${pct}%</p>
                                    <p class="text-xs font-bold text-slate-500">${entry.score}/${entry.total}</p>
                                </div>
                            </div>
                            ${hasDetails ? `<button onclick="reviewPastResult(${originalIndex})" class="w-full mt-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-sm py-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800">Review Answers</button>` : ''}
                        </div>
                    `;
                });
            }
            document.getElementById('history-modal').classList.remove('hidden');
        }

        function closeHistory() {
            document.getElementById('history-modal').classList.add('hidden');
        }

        function reviewPastResult(index) {
            closeHistory();
            const history = JSON.parse(localStorage.getItem('horlyTechHistory') || '[]');
            const entry = history[index];
            if (entry && entry.questions && entry.answers) {
                renderResultsView(entry.name, entry.course, entry.score, entry.total, entry.questions, entry.answers, entry.passed);
                
                // When looking at history, auto-show the review
                document.getElementById('review-section').classList.remove('hidden');
                document.getElementById('toggle-review-btn').textContent = "Hide Detailed Review";
            }
        }

        // --- PDF DOWNLOAD ---
        function handlePDFClick() {
            const btn = document.getElementById('pdf-download-btn');
            const textEl = document.getElementById('pdf-btn-text');

            if (!pdfConfirmWait) {
                pdfConfirmWait = true;
                textEl.textContent = "Click again to download";
                btn.classList.remove('from-blue-600', 'to-purple-600');
                btn.classList.add('from-rose-500', 'to-red-600', 'animate-pulse');

                pdfResetTimer = setTimeout(() => {
                    pdfConfirmWait = false;
                    textEl.textContent = "Save as PDF";
                    btn.classList.add('from-blue-600', 'to-purple-600');
                    btn.classList.remove('from-rose-500', 'to-red-600', 'animate-pulse');
                }, 4000);
            } else {
                clearTimeout(pdfResetTimer);
                pdfConfirmWait = false;
                
                textEl.textContent = "Generating...";
                btn.classList.remove('animate-pulse');

                generateCleanPDF().then(() => {
                    textEl.textContent = "Save as PDF";
                    btn.classList.add('from-blue-600', 'to-purple-600');
                    btn.classList.remove('from-rose-500', 'to-red-600');
                }).catch(err => {
                    alert("Download failed. Please try again.");
                    console.error(err);
                    textEl.textContent = "Save as PDF";
                    btn.classList.add('from-blue-600', 'to-purple-600');
                    btn.classList.remove('from-rose-500', 'to-red-600');
                });
            }
        }

        function generateCleanPDF() {
            if (!currentResultView) return Promise.reject("No data");

            return new Promise((resolve, reject) => {
                const { name, course, score, total, questions, answers, passed } = currentResultView;
                const pct = Math.round((score / total) * 100);

                const printDiv = document.createElement('div');
                
                let htmlStr = `
                    <div style="width: 800px; padding: 40px; font-family: Helvetica, Arial, sans-serif; background-color: #ffffff; color: #000000; position: relative; z-index: 1;">
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: -1; overflow: hidden; pointer-events: none;">
                            <div style="color: rgba(147, 51, 234, 0.08); font-size: 110px; font-weight: bold; transform: rotate(-45deg); position: absolute; top: 300px; left: 50px;">HoRly's_tech</div>
                            <div style="color: rgba(147, 51, 234, 0.08); font-size: 110px; font-weight: bold; transform: rotate(-45deg); position: absolute; top: 1100px; left: 50px;">HoRly's_tech</div>
                            <div style="color: rgba(147, 51, 234, 0.08); font-size: 110px; font-weight: bold; transform: rotate(-45deg); position: absolute; top: 1900px; left: 50px;">HoRly's_tech</div>
                            <div style="color: rgba(147, 51, 234, 0.08); font-size: 110px; font-weight: bold; transform: rotate(-45deg); position: absolute; top: 2700px; left: 50px;">HoRly's_tech</div>
                            <div style="color: rgba(147, 51, 234, 0.08); font-size: 110px; font-weight: bold; transform: rotate(-45deg); position: absolute; top: 3500px; left: 50px;">HoRly's_tech</div>
                        </div>

                        <div style="text-align: center; border-bottom: 3px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
                            <h1 style="color: #7e22ce; font-size: 42px; margin: 0; font-weight: 900;">HoRly's_Tech</h1>
                            <h2 style="color: #475569; font-size: 24px; margin: 10px 0 0 0;">Official Assessment Result</h2>
                        </div>

                        <div style="margin-bottom: 30px; font-size: 18px; line-height: 1.6;">
                            <div><strong>Student Name:</strong> ${name}</div>
                            <div><strong>Course Examined:</strong> ${course}</div>
                            <div><strong>Date Completed:</strong> ${new Date().toLocaleDateString()}</div>
                        </div>

                        <div style="background-color: ${passed ? '#ecfdf5' : '#fff1f2'}; border: 3px solid ${passed ? '#10b981' : '#f43f5e'}; padding: 30px; text-align: center; border-radius: 12px; margin-bottom: 40px;">
                            <div style="font-size: 70px; font-weight: 900; color: ${passed ? '#059669' : '#e11d48'}; margin: 0; line-height: 1;">${pct}%</div>
                            <div style="font-size: 24px; font-weight: bold; margin: 15px 0; color: #334155;">Final Score: ${score} out of ${total} correct</div>
                            <div style="font-size: 20px; font-weight: bold; color: ${passed ? '#065f46' : '#9f1239'};">${passed ? 'Status: PASSED' : 'Status: FAILED'}</div>
                        </div>

                        <h3 style="font-size: 26px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 25px; color: #1e293b;">Detailed Answer Review</h3>
                `;

                questions.forEach((q, qIdx) => {
                    const userAns = answers[qIdx];
                    const isCorrect = userAns === q.ans;
                    
                    htmlStr += `
                        <div style="margin-bottom: 25px; padding: 20px; border: 1px solid #cbd5e1; border-radius: 10px; background-color: rgba(255,255,255,0.95); page-break-inside: avoid;">
                            <div style="font-weight: bold; font-size: 18px; margin-bottom: 15px; color: #0f172a;">${qIdx + 1}. ${q.q}</div>
                    `;
                    
                    q.opts.forEach((opt, optIdx) => {
                        const isThisCorrectOpt = optIdx === q.ans;
                        const isThisUserOpt = optIdx === userAns;
                        
                        let optStyle = "padding: 12px; margin-bottom: 8px; border-radius: 6px; border: 1px solid #e2e8f0; background-color: #f8fafc; font-size: 16px; color: #475569;";
                        if (isThisCorrectOpt) {
                            optStyle = "padding: 12px; margin-bottom: 8px; border-radius: 6px; border: 2px solid #34d399; background-color: #d1fae5; color: #065f46; font-weight: bold; font-size: 16px;";
                        } else if (isThisUserOpt && !isCorrect) {
                            optStyle = "padding: 12px; margin-bottom: 8px; border-radius: 6px; border: 2px solid #fb7185; background-color: #ffe4e6; color: #9f1239; font-weight: bold; font-size: 16px;";
                        }
                        
                        htmlStr += `<div style="${optStyle}">${String.fromCharCode(65 + optIdx)}. ${opt}</div>`;
                    });
                    
                    if (userAns === undefined) {
                        htmlStr += `<div style="color: #e11d48; font-weight: bold; font-size: 16px; margin-top: 15px;">[!] You did not answer this question</div>`;
                    }
                    
                    htmlStr += `</div>`;
                });
                
                htmlStr += `</div>`; 
                printDiv.innerHTML = htmlStr;

                const opt = {
                    margin:       [0.4, 0.4, 0.4, 0.4], 
                    filename:     `${name.replace(/\s+/g, '_')}_HoRly_Result.pdf`,
                    image:        { type: 'jpeg', quality: 1.0 },
                    html2canvas:  { scale: 2, useCORS: true, letterRendering: true, windowWidth: 800 },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
                    pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
                };

                html2pdf().set(opt).from(printDiv).save().then(() => {
                    resolve();
                }).catch(err => {
                    reject(err);
                });
            });
        }


        // --- CALCULATOR FUNCTIONALITY ---
        const calcModal = document.getElementById('calculator-modal');
        const calcDisplay = document.getElementById('calc-display');
        
        function toggleCalculator() {
            calcModal.classList.toggle('hidden');
        }

        function calcAction(val) {
            if(val === 'C') {
                calcValue = '0';
            } else if(val === 'DEL') {
                calcValue = calcValue.length > 1 ? calcValue.slice(0, -1) : '0';
            } else if(val === '=') {
                try {
                    calcValue = String(new Function('return ' + calcValue)());
                } catch(e) {
                    calcValue = 'Error';
                }
            } else {
                if(calcValue === '0' && val !== '.') calcValue = val;
                else calcValue += val;
            }
            calcDisplay.value = calcValue;
        }

        // Dragging logic for Calculator
        let isDragging = false, startX, startY, startLeft, startBottom;
        document.getElementById('calc-header').addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(window.getComputedStyle(calcModal).left, 10);
            startBottom = parseInt(window.getComputedStyle(calcModal).bottom, 10);
        });
        document.addEventListener('mousemove', (e) => {
            if(!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            calcModal.style.left = `${startLeft + dx}px`;
            calcModal.style.bottom = `${startBottom - dy}px`;
        });
        document.addEventListener('mouseup', () => isDragging = false);

        document.getElementById('calc-header').addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startLeft = parseInt(window.getComputedStyle(calcModal).left, 10);
            startBottom = parseInt(window.getComputedStyle(calcModal).bottom, 10);
        });
        document.addEventListener('touchmove', (e) => {
            if(!isDragging) return;
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            calcModal.style.left = `${startLeft + dx}px`;
            calcModal.style.bottom = `${startBottom - dy}px`;
        });
        document.addEventListener('touchend', () => isDragging = false);
