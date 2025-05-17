import React from "react";

export default function CSAEPolicyPage() {
  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Child Sexual Abuse and Exploitation (CSAE) Policy</h1>
      <section className="space-y-6 text-base leading-7">
        <div>
          <p><b>Application Name:</b> Patify</p>
          <p><b>Developer Name:</b> Cihan Cengiz</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">1. Our Commitment</h2>
          <p>At Patify, ensuring the online safety of children is among our top priorities. We maintain a zero-tolerance policy towards any content or behavior involving child sexual abuse and exploitation (CSAE).</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">2. What is CSAE?</h2>
          <p>CSAE refers to content or conduct that sexually exploits or abuses children. This includes, but is not limited to:</p>
          <ul className="list-disc ml-6">
            <li>Grooming a child for sexual exploitation</li>
            <li>Sextortion</li>
            <li>Trafficking a child for sexual purposes</li>
            <li>Any similar actions</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">3. Prevention and Response</h2>
          <ul className="list-disc ml-6">
            <li><b>Content Monitoring:</b> All content shared within our application is regularly monitored to detect any CSAE-related material.</li>
            <li><b>User Reporting:</b> Users have access to a reporting mechanism to flag suspicious content or behavior.</li>
            <li><b>Prompt Action:</b> Reported content is promptly reviewed, and, when necessary, reported to the appropriate legal authorities.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">4. Contact</h2>
          <p>If you have any questions regarding our CSAE policy or our application, please contact us:</p>
          <ul className="list-disc ml-6">
            <li><b>Email:</b> b.cihancengiz@gmail.com</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

