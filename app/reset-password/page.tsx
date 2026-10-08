import MarketingShell from '@/components/MarketingShell';
import AccountForm from '@/components/AccountForm';
export const metadata={title:'A fresh start. | Joinery Studio'};
export default function Page(){return <MarketingShell><main id="main-content" className="accountPage"><p className="eyebrow">YOUR ACCOUNT</p><h1>A fresh start.</h1><p>Choose a new password for your account.</p><AccountForm mode="reset"/></main></MarketingShell>}
