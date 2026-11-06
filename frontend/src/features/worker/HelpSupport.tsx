"use client";

import Link from "next/link";
import { PageContainer, PageHeader, SectionCard } from "@/components/worker/WorkerUi";
import { useL } from "@/hooks/useL";

export default function HelpSupport() {
  const { L } = useL();

  const faqs: { q: string; a: string }[] = [
    {
      q: L("How do I apply for a job?", "मैं नौकरी के लिए आवेदन कैसे करूँ?", "मी नोकरीसाठी अर्ज कसा करू?"),
      a: L("Open Find Jobs, choose a job and tap Apply. You can apply to each job only once.", "नौकरियां खोजें खोलें, काम चुनें और आवेदन करें दबाएँ। हर काम के लिए एक ही बार आवेदन हो सकता है।", "नोकऱ्या शोधा उघडा, काम निवडा आणि अर्ज करा दाबा. प्रत्येक कामासाठी एकदाच अर्ज करता येतो."),
    },
    {
      q: L("What happens after I apply?", "आवेदन के बाद क्या होता है?", "अर्जानंतर काय होते?"),
      a: L("Your application stays Pending until the employer decides. If they accept, you get a job offer and a notification.", "नियोक्ता के फैसले तक आवेदन लंबित रहता है। स्वीकार करने पर आपको ऑफर और सूचना मिलती है।", "मालकाच्या निर्णयापर्यंत अर्ज प्रलंबित राहतो. स्वीकारल्यास तुम्हाला ऑफर आणि सूचना मिळते."),
    },
    {
      q: L("How do I accept an offer?", "मैं ऑफर कैसे स्वीकार करूँ?", "मी ऑफर कशी स्वीकारू?"),
      a: L("Go to Job Offers and tap Confirm offer. The job then moves to Active Work.", "जॉब ऑफर में जाकर ऑफर पक्का करें दबाएँ। फिर काम सक्रिय काम में चला जाता है।", "जॉब ऑफरमध्ये जाऊन ऑफर निश्चित करा दाबा. नंतर काम सक्रिय कामांमध्ये जाते."),
    },
    {
      q: L("Can I withdraw an application?", "क्या मैं आवेदन वापस ले सकता हूँ?", "मी अर्ज मागे घेऊ शकतो का?"),
      a: L("Yes, from My Applications while it is pending, an offer, or a confirmed job that has not started. A withdrawn application cannot be re-submitted.", "हाँ, मेरे आवेदन में लंबित, ऑफर या शुरू न हुए पक्के काम को वापस ले सकते हैं। वापस लिया आवेदन दोबारा नहीं भेजा जा सकता।", "होय, माझे अर्जमध्ये प्रलंबित, ऑफर किंवा सुरू न झालेले निश्चित काम मागे घेता येते. मागे घेतलेला अर्ज पुन्हा पाठवता येत नाही."),
    },
    {
      q: L("How do I improve my profile?", "मैं अपनी प्रोफ़ाइल कैसे बेहतर करूँ?", "मी माझी प्रोफाइल कशी सुधारू?"),
      a: L("Fill in your skills, experience, preferred locations and availability. The completion percentage in My Profile shows what is missing.", "कौशल, अनुभव, पसंदीदा स्थान और उपलब्धता भरें। मेरी प्रोफ़ाइल में प्रतिशत दिखाता है कि क्या बाकी है।", "कौशल्ये, अनुभव, पसंतीची ठिकाणे आणि उपलब्धता भरा. माझी प्रोफाइलमधील टक्केवारी काय बाकी आहे ते दाखवते."),
    },
  ];

  return (
    <PageContainer>
      <PageHeader title={L("Help & Support", "सहायता", "मदत व सहाय्य")} subtitle={L("Answers to common questions about using HireMate.", "हायरमेट के उपयोग से जुड़े आम सवालों के जवाब।", "हायरमेट वापरण्याबद्दलच्या सामान्य प्रश्नांची उत्तरे.")} />
      <SectionCard title={L("Frequently asked questions", "अक्सर पूछे जाने वाले सवाल", "नेहमी विचारले जाणारे प्रश्न")}>
        <div className="divide-y divide-[#edf1f7]">
          {faqs.map((f) => (
            <details key={f.q} className="group py-3">
              <summary className="cursor-pointer list-none text-[15px] font-semibold text-[#0b1b3d] marker:hidden">{f.q}</summary>
              <p className="mb-0 mt-2 text-[14.5px] leading-relaxed text-[#5b6a88]">{f.a}</p>
            </details>
          ))}
        </div>
      </SectionCard>
      <SectionCard title={L("Still need help?", "अब भी मदद चाहिए?", "अजूनही मदत हवी?")}>
        <p className="m-0 text-[14.5px] text-[#5b6a88]">{L("Ask the HireMate Assistant for job matches and career tips.", "नौकरी मैच और करियर टिप्स के लिए हायरमेट असिस्टेंट से पूछें।", "नोकरी जुळवणी आणि करिअर टिप्ससाठी हायरमेट असिस्टंटला विचारा.")}</p>
        <Link href="/ai-suggestions" className="mt-4 inline-block rounded-xl bg-[#1f6bff] px-5 py-2.5 text-[14px] font-semibold text-white no-underline hover:bg-[#1859d6]">
          {L("Open HireMate Assistant", "हायरमेट असिस्टेंट खोलें", "हायरमेट असिस्टंट उघडा")}
        </Link>
      </SectionCard>
    </PageContainer>
  );
}
