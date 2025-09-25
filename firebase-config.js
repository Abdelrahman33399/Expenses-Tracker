// firebase-config.js - الإصدار النهائي
(function() {
    // انتظر تحميل Firebase من CDN
    if (typeof firebase === 'undefined') {
        console.log('⏳ جاري تحميل Firebase...');
        
        const firebaseScript = document.createElement('script');
        firebaseScript.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
        firebaseScript.onload = function() {
            const authScript = document.createElement('script');
            authScript.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';
            authScript.onload = function() {
                const firestoreScript = document.createElement('script');
                firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';
                firestoreScript.onload = initFirebase;
                document.head.appendChild(firestoreScript);
            };
            document.head.appendChild(authScript);
        };
        document.head.appendChild(firebaseScript);
    } else {
        initFirebase();
    }

    function initFirebase() {
        const firebaseConfig = {
            apiKey: "AIzaSyBrYwyI8FIcjcl3L8_8rKH1DazgoPU7YMg",
            authDomain: "expenses-tracker-64547.firebaseapp.com",
            projectId: "expenses-tracker-64547",
            storageBucket: "expenses-tracker-64547.firebasestorage.app",
            messagingSenderId: "441962423457",
            appId: "1:441962423457:web:d32976902a6e37a17ffce0",
            measurementId: "G-LGX508DFZ6"
        };

        try {
            // Initialize Firebase
            firebase.initializeApp(firebaseConfig);
            
            // Make available globally
            window.auth = firebase.auth();
            window.db = firebase.firestore();
            window.googleProvider = new firebase.auth.GoogleAuthProvider();
            
            console.log('✅ Firebase initialized successfully');
        } catch (error) {
            console.error('❌ Firebase initialization error:', error);
        }
    }
})();