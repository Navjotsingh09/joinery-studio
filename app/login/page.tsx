import MarketingShell from '@/components/MarketingShell';
import AccountForm from '@/components/AccountForm';
export const metadata={title:'Welcome to your studio. | Joinery Studio'};
export default function Page(){return <MarketingShell><main id="main-content" className="accountPage"><p className="eyebrow">YOUR ACCOUNT</p><h1>Welcome to your studio.</h1><p>Log in to open your private design workspace.</p><AccountForm mode="login"/></main></MarketingShell>}
