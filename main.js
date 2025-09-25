// main.js - الإصدار المُحدث والمُنظف
let currentUser = null;
let auth, db;

// متغيرات حالة التعديل العامة
let editMode = false;
let currentExpenseId = null;

// انتظار تحميل Firebase
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.auth && window.db) {
            auth = window.auth;
            db = window.db;
            resolve();
        } else {
            setTimeout(() => waitForFirebase().then(resolve), 100);
        }
    });
}

// =============== دوال تسجيل الدخول والتسجيل ===============
window.loginWithEmail = async function() {
    await waitForFirebase();
    
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    const errorElement = document.getElementById('login-error');

    if (!email || !password) {
        if (errorElement) errorElement.textContent = 'يرجى إدخال الإيميل وكلمة المرور';
        return;
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ تم تسجيل الدخول بنجاح');
        
        // جلب بيانات المستخدم فوراً
        const user = userCredential.user;
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            currentUser = {
                uid: user.uid,
                ...userDoc.data()
            };
            
            // تحديث الواجهة فوراً
            updateUIForUser();
        }
        
        // الانتقال بعد ثانية
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        let msg = 'فشل في تسجيل الدخول';
        if (error.code === 'auth/user-not-found') msg = 'المستخدم غير موجود';
        else if (error.code === 'auth/wrong-password') msg = 'كلمة المرور خاطئة';
        if (errorElement) errorElement.textContent = msg;
    }
};

window.registerWithEmail = async function() {
    await waitForFirebase();
    
    const name = document.getElementById('register-name')?.value?.trim();
    const email = document.getElementById('register-email')?.value?.trim();
    const phone = document.getElementById('register-phone')?.value?.trim();
    const password = document.getElementById('register-password')?.value;
    const confirmPassword = document.getElementById('register-confirm-password')?.value;
    const salary = parseFloat(document.getElementById('register-salary')?.value) || 0;
    const errorElement = document.getElementById('register-error');

    if (!name || !email || !password || !confirmPassword) {
        if (errorElement) errorElement.textContent = 'يرجى إدخال جميع الحقول المطلوبة';
        return;
    }

    if (password !== confirmPassword) {
        if (errorElement) errorElement.textContent = 'كلمة المرور غير متطابقة';
        return;
    }

    if (password.length < 6) {
        if (errorElement) errorElement.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // حفظ بيانات إضافية
        await db.collection("users").doc(user.uid).set({
            name: name,
            email: email,
            phone: phone || '',
            salary: salary,
            categories: ['يومية', 'عاجلة', 'ترفيه', 'مواصلات', 'تسوق', 'أخرى'],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('✅ تم إنشاء الحساب بنجاح!');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        console.error('Registration error:', error);
        let msg = 'فشل في إنشاء الحساب';
        if (error.code === 'auth/email-already-in-use') msg = 'هذا الإيميل مستخدم مسبقًا';
        if (errorElement) errorElement.textContent = msg;
    }
};

// =============== تتبع حالة المستخدم ===============
function initAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        console.log('Auth state changed:', user ? '✅ مسجل دخول' : '❌ غير مسجل');
        
        if (user) {
            try {
                const userDoc = await db.collection("users").doc(user.uid).get();
                if (userDoc.exists) {
                    currentUser = {
                        uid: user.uid,
                        ...userDoc.data()
                    };

                    console.log('👤 المستخدم الحالي:', currentUser.name);
                    
                    // تحديث الواجهة فوراً
                    updateUIForUser();
                    
                    // إذا كان في صفحة login، حول إلى الرئيسية بعد تأخير بسيط
                    if (window.location.pathname.includes('login.html')) {
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 1500);
                    }
                    
                    // تهيئة التطبيق إذا كان في الصفحة الرئيسية
                    if (window.location.pathname.includes('index.html') && typeof initApp === 'function') {
                        setTimeout(() => {
                            initApp();
                        }, 500);
                    }
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        } else {
            currentUser = null;
            console.log('👤 لا يوجد مستخدم مسجل');
            updateUIForUser();
            
            // إذا كان في صفحة profile، حول إلى login
            if (window.location.pathname.includes('profile.html')) {
                window.location.href = 'login.html';
            }
        }
    });
}

// =============== تحديث الواجهة حسب حالة المستخدم ===============
function updateUIForUser() {
    // العناصر القديمة
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const userDisplayName = document.getElementById('user-display-name');
    const guestMessage = document.getElementById('guest-message');
    
    // العناصر الجديدة
    const userAvatar = document.getElementById('user-avatar');
    const userFirstName = document.getElementById('user-first-name');

    if (currentUser) {
        console.log('🔄 تحديث الواجهة للمستخدم:', currentUser.name);
        
        // إخفاء أزرار تسجيل الدخول
        if (authButtons) authButtons.style.display = 'none';
        if (guestMessage) guestMessage.style.display = 'none';
        
        // العناصر القديمة
        if (userInfo) userInfo.style.display = 'flex';
        if (userDisplayName) userDisplayName.textContent = `مرحبًا، ${currentUser.name}`;
        
        // العناصر الجديدة - إظهار الأيقونة + أول اسم
        if (userAvatar) {
            userAvatar.style.display = 'flex';
            const firstName = currentUser.name.split(' ')[0] || currentUser.name;
            if (userFirstName) userFirstName.textContent = firstName;
        }
        
        // تحميل صفحة الحساب إذا كانت مفتوحة
        if (window.location.pathname.includes('profile.html') && typeof loadUserProfile === 'function') {
            loadUserProfile();
        }
        
        // تهيئة التطبيق إذا كان في الصفحة الرئيسية
        if (window.location.pathname.includes('index.html') && typeof initApp === 'function') {
            initApp();
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        if (userAvatar) userAvatar.style.display = 'none';
        if (guestMessage) guestMessage.style.display = 'block';
        
        // إظهار رسالة تسجيل الدخول في صفحة الحساب
        if (window.location.pathname.includes('profile.html')) {
            const profileContent = document.getElementById('profile-content');
            const loginPrompt = document.getElementById('login-prompt');
            if (profileContent) profileContent.style.display = 'none';
            if (loginPrompt) loginPrompt.style.display = 'block';
        }
    }
}

// =============== دوال صفحة الحساب ===============
window.loadUserProfile = async function() {
    const profileContent = document.getElementById('profile-content');
    const loginPrompt = document.getElementById('login-prompt');

    if (!currentUser) {
        if (profileContent) profileContent.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
        return;
    }

    try {
        const userDoc = await db.collection("users").doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();

            // تحديث بيانات الحساب
            if (profileContent) profileContent.style.display = 'block';
            if (loginPrompt) loginPrompt.style.display = 'none';
            
            const updateElement = (id, value) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value || 'غير محدد';
            };

            updateElement('profile-name', userData.name);
            updateElement('profile-email', userData.email);
            updateElement('profile-phone', userData.phone);
            updateElement('profile-salary', userData.salary);
            
            // تاريخ الإنشاء
            const createdAt = userData.createdAt;
            if (createdAt) {
                const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
                updateElement('profile-created-at', date.toLocaleDateString('ar-EG'));
            } else {
                updateElement('profile-created-at', 'غير محدد');
            }

            // عرض التصنيفات
            const categoriesList = document.getElementById('categories-list');
            if (categoriesList) {
                categoriesList.innerHTML = '';
                if (userData.categories && Array.isArray(userData.categories)) {
                    userData.categories.forEach(cat => {
                        const li = document.createElement('li');
                        li.textContent = cat;
                        categoriesList.appendChild(li);
                    });
                } else {
                    categoriesList.innerHTML = '<li>لا توجد تصنيفات مخصصة</li>';
                }
            }
        }
    } catch (error) {
        console.error("Error loading profile:", error);
        alert("حدث خطأ أثناء تحميل بيانات الحساب");
    }
};

// =============== دالة تسجيل الخروج ===============
window.logout = function() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        auth.signOut().then(() => {
            currentUser = null;
            editMode = false;
            currentExpenseId = null;
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error("Error signing out:", error);
            alert("حدث خطأ أثناء تسجيل الخروج");
        });
    }
};

// =============== دوال التطبيق الرئيسي (المصروفات) ===============
window.initApp = function() {
    if (!currentUser) return;
    
    // Elements
    const title = document.getElementById("title");
    const price = document.getElementById("price");
    const taxes = document.getElementById("taxes");
    const ads = document.getElementById("ads");
    const discount = document.getElementById("discount");
    const total = document.getElementById("total");
    const count = document.getElementById("count");
    const category = document.getElementById("category");
    const submit = document.getElementById("submit");

    // Create notes and completed fields if not exists
    let notesInput = document.getElementById('notes');
    let completedCheckbox = document.getElementById('completed');
    
    if (!notesInput) {
        notesInput = document.createElement('input');
        notesInput.type = 'text';
        notesInput.id = 'notes';
        notesInput.placeholder = 'ملاحظات (اختياري)';
        if (count && submit) {
            count.parentNode.insertBefore(notesInput, submit);
        }
    }

    if (!completedCheckbox) {
        completedCheckbox = document.createElement('input');
        completedCheckbox.type = 'checkbox';
        completedCheckbox.id = 'completed';
        const completedLabel = document.createElement('label');
        completedLabel.htmlFor = 'completed';
        completedLabel.textContent = ' تم الإنجاز؟';
        completedLabel.style.display = 'block';
        completedLabel.style.margin = '10px 0';
        if (count && submit) {
            count.parentNode.insertBefore(completedLabel, submit);
            count.parentNode.insertBefore(completedCheckbox, completedLabel);
        }
    }

    // Load categories
    function loadCategories() {
        if (!category || !currentUser.categories) return;
        category.innerHTML = '';
        currentUser.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            category.appendChild(option);
        });
    }

    // Get total price
    window.getTotal = function() {
        if (!price || !total || !taxes || !ads || !discount) return;
        
        if (price.value !== "") {
            const priceVal = parseFloat(price.value) || 0;
            const taxesVal = parseFloat(taxes.value) || 0;
            const adsVal = parseFloat(ads.value) || 0;
            const discountVal = parseFloat(discount.value) || 0;
            
            const result = (priceVal + taxesVal + adsVal) - discountVal;
            total.innerText = result.toFixed(2);
            total.style.background = "#03dac6";
        } else {
            total.innerText = "0.00";
            total.style.background = "#cf6679";
        }
    };

    // Clear inputs
    function clearInputs() {
        if (title) title.value = "";
        if (price) price.value = "";
        if (taxes) taxes.value = "";
        if (ads) ads.value = "";
        if (discount) discount.value = "";
        window.getTotal();
        if (count) count.value = "1";
        if (category && currentUser.categories) category.value = currentUser.categories[0];
        if (notesInput) notesInput.value = "";
        if (completedCheckbox) completedCheckbox.checked = false;

        // إعادة وضع الزر للإنشاء
        if (submit) {
            submit.textContent = "إضافة مصروف";
            submit.style.background = "";
        }
        editMode = false;
        currentExpenseId = null;
    }

    // Show data from Firestore
    window.showData = async function() {
        if (!currentUser) return;

        try {
            const expensesRef = db.collection("users").doc(currentUser.uid).collection("expenses");
            const snapshot = await expensesRef.get();
            currentUser.expenses = [];
            snapshot.forEach(doc => {
                currentUser.expenses.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            let table = "";
            currentUser.expenses.forEach((expense, i) => {
                table += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${expense.title}</td>
                    <td>${expense.price}</td>
                    <td>${expense.total}</td>
                    <td>${expense.category}</td>
                    <td><input type="checkbox" ${expense.completed ? 'checked' : ''} onchange="toggleComplete('${expense.id}', this.checked)"></td>
                    <td class="notes">${expense.notes || '-'}</td>
                    <td><button onclick="updateData(${i})">تعديل</button></td>
                    <td><button onclick="deleteData('${expense.id}')">حذف</button></td>
                </tr>`;
            });

            const tbody = document.getElementById("tbody");
            if (tbody) tbody.innerHTML = table;

            const btnDelete = document.getElementById("deleteAll");
            if (btnDelete) {
                if (currentUser.expenses.length > 0) {
                    btnDelete.innerHTML = `<button onclick="deleteAll()">حذف الكل (${currentUser.expenses.length})</button>`;
                } else {
                    btnDelete.innerHTML = "";
                }
            }
        } catch (error) {
            console.error("Error loading expenses:", error);
        }
    };

    // Toggle completion status
    window.toggleComplete = async function(expenseId, completed) {
        if (!currentUser) return;
        try {
            await db.collection("users").doc(currentUser.uid).collection("expenses").doc(expenseId).update({
                completed: completed
            });
            showData();
        } catch (error) {
            console.error("Error updating completion:", error);
        }
    };

    // Submit button handler (يدعم الإنشاء والتعديل)
    if (submit) {
        submit.onclick = async function() {
            if (!currentUser) {
                alert('يجب تسجيل الدخول أولاً لحفظ المصروفات!');
                window.location.href = 'login.html';
                return;
            }

            if (!title || !price || !total || !category) {
                alert('حدث خطأ في العثور على عناصر النموذج');
                return;
            }

            const priceVal = parseFloat(price.value) || 0;
            const totalVal = parseFloat(total.innerText) || 0;

            const newPro = {
                title: title.value.trim(),
                price: priceVal,
                taxes: parseFloat(taxes?.value) || 0,
                ads: parseFloat(ads?.value) || 0,
                discount: parseFloat(discount?.value) || 0,
                total: totalVal,
                category: category.value,
                notes: notesInput?.value?.trim() || '',
                completed: completedCheckbox?.checked || false,
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date()
            };

            if (!newPro.title || newPro.price <= 0 || !newPro.category) {
                alert('يرجى إدخال البيانات الأساسية بشكل صحيح');
                return;
            }

            try {
                const expensesRef = db.collection("users").doc(currentUser.uid).collection("expenses");

                if (editMode && currentExpenseId) {
                    // ✏️ وضع التعديل
                    await expensesRef.doc(currentExpenseId).update(newPro);
                    alert('✅ تم حفظ التعديلات بنجاح!');
                } else {
                    // ➕ وضع الإنشاء
                    await expensesRef.add(newPro);
                }

                clearInputs();
                showData();
                showMonthlyReport();
            } catch (error) {
                console.error("Error saving expense:", error);
                alert("فشل في حفظ المصروف!");
            }
        };
    }

    // Delete single expense
    window.deleteData = async function(expenseId) {
        if (!currentUser) return;
        if (!confirm('هل أنت متأكد من الحذف؟')) return;

        try {
            await db.collection("users").doc(currentUser.uid).collection("expenses").doc(expenseId).delete();
            showData();
            showMonthlyReport();
        } catch (error) {
            console.error("Error deleting expense:", error);
            alert("فشل في الحذف!");
        }
    };

    // Delete all expenses
    window.deleteAll = async function() {
        if (!currentUser) return;
        if (!confirm('⚠️ تحذير: سيتم حذف جميع المصروفات ولا يمكن التراجع!')) return;

        try {
            const expensesRef = db.collection("users").doc(currentUser.uid).collection("expenses");
            const snapshot = await expensesRef.get();
            const deletePromises = [];
            snapshot.forEach(doc => {
                deletePromises.push(doc.ref.delete());
            });
            await Promise.all(deletePromises);
            showData();
            showMonthlyReport();
        } catch (error) {
            console.error("Error deleting all expenses:", error);
            alert("فشل في حذف الكل!");
        }
    };

    // Monthly report
    window.showMonthlyReport = async function() {
        if (!currentUser) return;

        try {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            const expensesRef = db.collection("users").doc(currentUser.uid).collection("expenses");
            const snapshot = await expensesRef.get();
            const monthlyExpenses = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(exp => exp.date && exp.date.startsWith(currentMonth));

            const totalSpent = monthlyExpenses.reduce((sum, exp) => sum + (exp.total || 0), 0);
            const categoryTotals = {};
            monthlyExpenses.forEach(exp => {
                categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + (exp.total || 0);
            });

            let mostSpentCategory = '';
            let maxAmount = 0;
            for (const cat in categoryTotals) {
                if (categoryTotals[cat] > maxAmount) {
                    maxAmount = categoryTotals[cat];
                    mostSpentCategory = cat;
                }
            }

            let reportHTML = `
                <h3>📊 التقرير الشهري</h3>
                <div class="stat">إجمالي المصروفات هذا الشهر: <strong>${totalSpent.toFixed(2)} ج.م</strong></div>
                <div class="stat">المرتب: <strong>${currentUser.salary || 'غير محدد'} ج.م</strong></div>
                <div class="stat">أكثر تصنيف صُرف فيه: <strong>${mostSpentCategory || 'لا يوجد'}</strong> (${maxAmount.toFixed(2)} ج.م)</div>
            `;

            if (currentUser.salary) {
                const remaining = currentUser.salary - totalSpent;
                reportHTML += `<div class="stat">المتبقي من المرتب: <strong style="color: ${remaining >= 0 ? '#03dac6' : '#cf6679'}">${remaining.toFixed(2)} ج.م</strong></div>`;
                if (mostSpentCategory && (maxAmount / totalSpent) > 0.3) {
                    reportHTML += `<div class="stat" style="color: #ff9800">💡 نصيحة: حاول تقليل المصروفات في "${mostSpentCategory}" لتوفير أكثر!</div>`;
                }
            }

            const monthlyReport = document.getElementById('monthly-report');
            if (monthlyReport) {
                monthlyReport.innerHTML = reportHTML;
                monthlyReport.style.display = 'block';
            }
        } catch (error) {
            console.error("Error generating monthly report:", error);
        }
    };

    // Search functions
    window.searchMood = "title";
    window.getSearchMood = function(id) {
        const search = document.getElementById("search");
        window.searchMood = id === "searchTitle" ? "title" : "category";
        if (search) {
            search.placeholder = `بحث حسب ${window.searchMood === 'title' ? 'العنوان' : 'التصنيف'}...`;
            search.focus();
            search.value = "";
        }
        showData();
    };

    window.searchData = function(value) {
        if (!currentUser || !currentUser.expenses || !value) {
            showData();
            return;
        }

        let table = "";
        currentUser.expenses.forEach((expense, i) => {
            const searchValue = value.toLowerCase();
            const match = window.searchMood === "title" 
                ? expense.title.toLowerCase().includes(searchValue)
                : expense.category.toLowerCase().includes(searchValue);

            if (match) {
                table += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${expense.title}</td>
                    <td>${expense.price}</td>
                    <td>${expense.total}</td>
                    <td>${expense.category}</td>
                    <td><input type="checkbox" ${expense.completed ? 'checked' : ''} onchange="toggleComplete('${expense.id}', this.checked)"></td>
                    <td class="notes">${expense.notes || '-'}</td>
                    <td><button onclick="updateData(${i})">تعديل</button></td>
                    <td><button onclick="deleteData('${expense.id}')">حذف</button></td>
                </tr>`;
            }
        });

        const tbody = document.getElementById("tbody");
        if (tbody) tbody.innerHTML = table;
    };

    // Add new category
    window.addCategory = function() {
        const newCat = prompt('أدخل اسم التصنيف الجديد:');
        if (newCat && newCat.trim() && !currentUser.categories.includes(newCat.trim())) {
            currentUser.categories.push(newCat.trim());
            db.collection("users").doc(currentUser.uid).update({
                categories: currentUser.categories
            }).then(() => {
                loadCategories();
                alert('تم إضافة التصنيف بنجاح!');
            }).catch((error) => {
                console.error("Error adding category:", error);
                alert("فشل في إضافة التصنيف!");
            });
        }
    };

    // Initialize
    loadCategories();
    showData();
    showMonthlyReport();

    // Add "Add Category" button if not exists
    if (category && !document.getElementById('add-category-btn')) {
        const addCatBtn = document.createElement('button');
        addCatBtn.id = 'add-category-btn';
        addCatBtn.type = 'button';
        addCatBtn.innerText = '➕ إضافة تصنيف';
        addCatBtn.style.marginTop = '10px';
        addCatBtn.onclick = window.addCategory;
        category.parentNode.appendChild(addCatBtn);
    }
};

// دالة التعديل
window.updateData = function(index) {
    if (!currentUser || !currentUser.expenses || index >= currentUser.expenses.length) return;

    const expense = currentUser.expenses[index];
    if (!expense.id) return;

    // تحديث حالة التعديل العامة
    editMode = true;
    currentExpenseId = expense.id;

    // ملء الحقول
    const updateField = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.value = value || '';
    };

    updateField("title", expense.title);
    updateField("price", expense.price);
    updateField("taxes", expense.taxes);
    updateField("ads", expense.ads);
    updateField("discount", expense.discount);
    updateField("category", expense.category);
    updateField("notes", expense.notes);

    const totalElement = document.getElementById("total");
    if (totalElement) totalElement.innerText = (expense.total || 0).toFixed(2);
    
    const completedCheckbox = document.getElementById("completed");
    if (completedCheckbox) completedCheckbox.checked = !!expense.completed;

    // تغيير نص الزر
    const submitBtn = document.getElementById("submit");
    if (submitBtn) {
        submitBtn.textContent = "حفظ التعديلات";
        submitBtn.style.background = "linear-gradient(90deg, #ff9800, #ff5722)";
    }

    // التمرير للأعلى مع تحديث المجموع
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.getTotal) window.getTotal();
};

// =============== تهيئة التطبيق ===============
document.addEventListener('DOMContentLoaded', function() {
    waitForFirebase().then(() => {
        initAuthListener();
        console.log('✅ Application initialized');
    }).catch((error) => {
        console.error('Error initializing application:', error);
    });
});