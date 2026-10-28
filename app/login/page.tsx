import MarketingShell from '@/components/MarketingShell';
import AccountLayout from '@/components/AccountLayout';
import AccountForm from '@/components/AccountForm';
export const metadata={title:'Welcome to your studio.'+' | Joinery Studio'};
export default function Page(){return <MarketingShell><AccountLayout eyebrow='YOUR ACCOUNT' title='Welcome to your studio.' intro='Log in to open your private design workspace.'><AccountForm mode="login"/></AccountLayout></MarketingShell>}
