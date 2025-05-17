import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <section className="space-y-6 text-base leading-7">
        <div>
          <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
          <p>At Patify, we prioritize our users' privacy. This policy explains how the information collected through our mobile application is processed, stored, and protected.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">2. Information Collected</h2>
          <p>Our application may collect the following information to facilitate the pet adoption process:</p>
          <ul className="list-disc ml-6">
            <li><b>Location Data:</b> Your current or last recorded location information from your device, used for calculating distances between listings.</li>
            <li><b>Other Information:</b> Basic details such as your name and email address, used for creating and managing your user account.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">3. Use of Information</h2>
          <p>The collected location data is used to calculate the distance between different listings and to show you the listings nearest to you. The other profile information is processed for the creation and management of your user account.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">4. Sharing of Information</h2>
          <p>Your personal data will not be shared with third parties except when legally required. Your location data is only used for calculating distances between listings.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">5. Data Security</h2>
          <p>Appropriate technical and administrative measures are taken to protect your data. However, please note that a 100% guarantee of data security during transmission in mobile applications cannot be provided.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">6. Data Retention Period</h2>
          <p>The collected data is stored for as long as necessary to provide our services and to improve the user experience. Once your transaction is completed or there is no further need to process the data, your data will be deleted or anonymized.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">7. Changes</h2>
          <p>Our privacy policy may be updated from time to time. In case of significant changes, our users will be notified through the application.</p>
        </div>
      </section>
    </main>
  );
}

