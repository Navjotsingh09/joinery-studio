import MarketingShell from '@/components/MarketingShell';
import AccountForm from '@/components/AccountForm';
export const metadata={title:'Let’s get you back in. | Joinery Studio'};
export default function Page(){return <MarketingShell><main id="main-content" className="accountPage"><p className="eyebrow">YOUR ACCOUNT</p><h1>Let’s get you back in.</h1><p>Request a secure password reset link.</p><AccountForm mode="forgot"/></main></MarketingShell>}
