import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, query, orderBy } from 'firebase/firestore';

// ১. আপনার ফায়ারবেস কনফিগারেশন এখানে বসান
const firebaseConfig = {
	apiKey: "YOUR_API_KEY",
	authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
	projectId: "YOUR_PROJECT_ID",
	storageBucket: "YOUR_PROJECT_ID.appspot.com",
	messagingSenderId: "YOUR_SENDER_ID",
	appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
	const [user, setUser] = useState(null);
	const [userData, setUserData] = useState(null);
	const [records, setRecords] = useState([]);

	// ফর্ম স্টেট
	const [phone, setPhone] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');
	const [dob, setDob] = useState('');
	const [isLoginFlow, setIsLoginFlow] = useState(true);

	// নতুন দেনাদার যুক্ত করার স্টেট
	const [debtorName, setDebtorName] = useState('');
	const [amount, setAmount] = useState('');
	const [files, setFiles] = useState([]);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
			setUser(currentUser);
			if (currentUser) {
				const docRef = doc(db, 'users', currentUser.uid);
				const docSnap = await getDoc(docRef);
				if (docSnap.exists()) {
					setUserData(docSnap.data());
				}
			} else {
				setUserData(null);
			}
			fetchRecords();
		});

		return unsubscribe;
	}, []);

	const fetchRecords = async () => {
		const q = query(collection(db, 'debts'), orderBy('timestamp', 'desc'));
		const querySnapshot = await getDocs(q);
		const data = [];
		querySnapshot.forEach((debtDoc) => data.push(debtDoc.data()));
		setRecords(data);
	};

	const handleAuth = async (e) => {
		e.preventDefault();
		const fakeEmail = `${phone}@takapai.com.bd`; // ফোন নম্বরকে ইমেইলে রূপান্তর
		try {
			if (isLoginFlow) {
				await signInWithEmailAndPassword(auth, fakeEmail, password);
				alert('সফলভাবে লগইন হয়েছে!');
			} else {
				const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
				// প্রোফাইল সেভ করা
				await setDoc(doc(db, 'users', userCredential.user.uid), {
					name,
					phone,
					dob
				});
				alert('রেজিস্ট্রেশন সফল হয়েছে!');
			}
		} catch (error) {
			alert(error.message);
		}
	};

	const handleAddDebt = async (e) => {
		e.preventDefault();
		const fileNames = Array.from(files).map((file) => file.name); // প্রমাণের নামগুলো নেওয়া

		try {
			await addDoc(collection(db, 'debts'), {
				creditorName: userData.name,
				creditorPhone: userData.phone,
				debtorName,
				amount,
				evidenceFiles: fileNames,
				timestamp: new Date().toISOString()
			});
			alert('দেনাদারের তথ্য সফলভাবে যুক্ত হয়েছে!');
			setDebtorName('');
			setAmount('');
			setFiles([]);
			fetchRecords();
		} catch (error) {
			alert('তথ্য যুক্ত করতে সমস্যা হয়েছে!');
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-4 font-sans">
			<header className="bg-red-600 text-white p-4 text-center rounded shadow-lg mb-8">
				<h1 className="text-3xl font-bold">Takapai.com.bd</h1>
				<p>আপনার পাওনা টাকার হিসাব ও প্রমাণ</p>
			</header>

			{/* লগইন / রেজিস্ট্রেশন সেকশন */}
			{!user ? (
				<div className="bg-white p-6 rounded shadow-md max-w-md mx-auto">
					<h2 className="text-xl font-bold mb-4">{isLoginFlow ? 'লগইন করুন' : 'নতুন রেজিস্ট্রেশন'}</h2>
					<form onSubmit={handleAuth} className="space-y-4">
						{!isLoginFlow && (
							<>
								<input type="text" placeholder="আপনার পূর্ণ নাম" required className="w-full border p-2 rounded" value={name} onChange={(e) => setName(e.target.value)} />
								<input type="date" required className="w-full border p-2 rounded" value={dob} onChange={(e) => setDob(e.target.value)} />
							</>
						)}
						<input type="tel" placeholder="মোবাইল নম্বর (যেমন: 017...)" required className="w-full border p-2 rounded" value={phone} onChange={(e) => setPhone(e.target.value)} />
						<input type="password" placeholder="পাসওয়ার্ড" required className="w-full border p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} />

						<button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700">
							{isLoginFlow ? 'লগইন' : 'রেজিস্ট্রেশন'}
						</button>
					</form>
					<button onClick={() => setIsLoginFlow(!isLoginFlow)} className="mt-4 text-blue-600 underline w-full text-center">
						{isLoginFlow ? 'একাউন্ট নেই? রেজিস্ট্রেশন করুন' : 'একাউন্ট আছে? লগইন করুন'}
					</button>
				</div>
			) : (
				/* ড্যাশবোর্ড ও অভিযোগ যুক্ত করার ফর্ম */
				<div className="bg-white p-6 rounded shadow-md mb-8">
					<div className="flex justify-between items-center mb-6 border-b pb-2">
						<h2 className="text-xl font-bold">স্বাগতম, {userData?.name}</h2>
						<button onClick={() => signOut(auth)} className="bg-red-500 text-white px-4 py-2 rounded">লগআউট</button>
					</div>

					<h3 className="font-bold text-lg mb-4 text-red-600">নতুন দেনাদারের তথ্য যুক্ত করুন</h3>
					<form onSubmit={handleAddDebt} className="space-y-4">
						<input type="text" placeholder="দেনাদারের পূর্ণ নাম" required className="w-full border p-2 rounded" value={debtorName} onChange={(e) => setDebtorName(e.target.value)} />
						<input type="number" placeholder="পাওনা টাকার পরিমাণ (৳)" required className="w-full border p-2 rounded" value={amount} onChange={(e) => setAmount(e.target.value)} />

						<div>
							<label className="block text-sm font-bold mb-1">প্রমাণাদি যুক্ত করুন (একাধিক ছবি বা আইডি কার্ড)</label>
							<input type="file" multiple required className="w-full border p-2 rounded bg-gray-50" onChange={(e) => setFiles(e.target.files)} />
						</div>

						<button type="submit" className="w-full bg-green-600 text-white p-2 rounded font-bold hover:bg-green-700">
							অভিযোগ প্রকাশ করুন
						</button>
					</form>
				</div>
			)}

			{/* পাবলিক ফিড (সকলের জন্য উন্মুক্ত) */}
			<div className="mt-12">
				<h2 className="text-2xl font-bold mb-6 text-center">সকল দেনাদার ও পাওনাদারের তালিকা</h2>
				<div className="grid gap-6 md:grid-cols-2">
					{records.map((record, index) => (
						<div key={index} className="bg-white p-4 rounded shadow-md border-l-4 border-red-500">
							<p className="text-sm text-gray-500 mb-2">তারিখ: {new Date(record.timestamp).toLocaleDateString()}</p>
							<p className="text-lg"><strong>পাওনাদার:</strong> {record.creditorName}</p>
							<p className="text-lg text-red-600"><strong>দেনাদার:</strong> {record.debtorName}</p>
							<p className="text-xl font-bold mt-2">টাকার পরিমাণ: ৳{record.amount}</p>

							<div className="mt-4 p-3 bg-gray-100 rounded">
								<p className="text-sm font-bold mb-2">যুক্ত করা প্রমাণাদি:</p>
								<ul className="list-disc pl-5 text-sm text-blue-600">
									{record.evidenceFiles?.map((file, i) => (
										<li key={i}>{file}</li>
									))}
								</ul>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
