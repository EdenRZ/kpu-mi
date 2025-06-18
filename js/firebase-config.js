// Firebase Configuration (Alternative to MySQL)
// Uncomment and configure if you prefer Firebase

/*
// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';

// Your Firebase config (get from Firebase Console)
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sync data across all browser modes
class FirebaseSync {
    constructor() {
        this.setupRealtimeSync();
    }
    
    // Real-time sync for election status
    setupRealtimeSync() {
        const electionRef = doc(db, 'settings', 'election');
        onSnapshot(electionRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                localStorage.setItem('election_status', data.status);
                // Update UI
                if (window.updateElectionStatusIndicator) {
                    window.updateElectionStatusIndicator();
                }
            }
        });
        
        const usersRef = doc(db, 'data', 'users');
        onSnapshot(usersRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                localStorage.setItem('kpu_users', JSON.stringify(data.users));
            }
        });
    }
    
    // Update election status
    async updateElectionStatus(status) {
        try {
            await setDoc(doc(db, 'settings', 'election'), {
                status: status,
                updatedAt: new Date()
            });
            return true;
        } catch (error) {
            console.error('Error updating election status:', error);
            return false;
        }
    }
    
    // Update users data
    async updateUsers(users) {
        try {
            await setDoc(doc(db, 'data', 'users'), {
                users: users,
                updatedAt: new Date()
            });
            return true;
        } catch (error) {
            console.error('Error updating users:', error);
            return false;
        }
    }
    
    // Get current data
    async getCurrentData() {
        try {
            const electionDoc = await getDoc(doc(db, 'settings', 'election'));
            const usersDoc = await getDoc(doc(db, 'data', 'users'));
            
            return {
                electionStatus: electionDoc.exists() ? electionDoc.data().status : 'stopped',
                users: usersDoc.exists() ? usersDoc.data().users : []
            };
        } catch (error) {
            console.error('Error getting data:', error);
            return null;
        }
    }
}

// Initialize Firebase sync
const firebaseSync = new FirebaseSync();
window.firebaseSync = firebaseSync;
*/

// Instructions for setup:
console.log(`
🔥 FIREBASE SETUP INSTRUCTIONS:

1. Go to https://console.firebase.google.com/
2. Create new project: "kpu-monasmuda"
3. Enable Firestore Database
4. Get config from Project Settings
5. Replace firebaseConfig above
6. Uncomment the code
7. Include this script in your HTML files

Benefits:
✅ Real-time sync across all devices
✅ Works in incognito mode
✅ No local server needed
✅ Automatic backup
✅ Multi-user access
`);
