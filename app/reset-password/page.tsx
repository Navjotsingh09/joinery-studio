import MarketingShell from '@/components/MarketingShell';
import AccountLayout from '@/components/AccountLayout';
import AccountForm from '@/components/AccountForm';
export const metadata={title:'A fresh start.'+' | Joinery Studio'};
export default function Page(){return <MarketingShell><AccountLayout eyebrow='YOUR ACCOUNT' title='A fresh start.' intro='Choose a new password for your account.'><AccountForm mode="reset"/></AccountLayout></MarketingShell>}
