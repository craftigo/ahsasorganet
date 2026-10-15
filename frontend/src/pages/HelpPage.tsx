import { HelpCircle, CheckCircle, Shield, Award, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HelpPage() {
  const steps = [
    {
      num: '1',
      title: 'Registration & Login',
      icon: <Users className="w-5 h-5 text-maroon" />,
      text: 'First, register your class unit using the Register link. You will need your class name, committee title, email, password, and the names of all 9 mandatory executive committee officers. Once submitted, log in to access your dashboard.',
    },
    {
      num: '2',
      title: 'Unit Dashboard & Activity Submissions',
      icon: <CheckCircle className="w-5 h-5 text-maroon" />,
      text: 'Inside your dashboard, upload proof of completed activities (photos, documents) under Submit Activity Report. You can also view official circulars, manage your student roster, and update class details when editing is enabled.',
    },
    {
      num: '3',
      title: 'Admin Verification & Point System',
      icon: <Shield className="w-5 h-5 text-maroon" />,
      text: 'Administrators review submitted reports, assign points from 0 to 100, award performance grades (A+ to E), and approve or reject submissions with feedback. Points automatically increment the class ranking.',
    },
    {
      num: '4',
      title: 'Leaderboard & Rankings',
      icon: <Award className="w-5 h-5 text-maroon" />,
      text: 'The Leaderboard displays real-time cumulative scores and grades across all affiliated classes. Rankings update automatically whenever reports are approved.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-fade-in">
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-maroon/10 text-maroon mb-3">
          <HelpCircle className="w-3.5 h-3.5" /> Portal Documentation
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          How to Use the AHSAS Portal
        </h1>
        <p className="mt-2 text-charcoal text-sm sm:text-base">
          A quick guide to navigating activity reports, scoring, and class administration.
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((s) => (
          <div
            key={s.num}
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-5 items-start hover:shadow-md transition"
          >
            <div className="w-10 h-10 rounded-2xl bg-maroon/10 text-maroon flex items-center justify-center font-black text-base flex-shrink-0">
              {s.num}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-gray-900">{s.title}</h3>
              </div>
              <p className="text-sm text-charcoal leading-relaxed">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-8 bg-gradient-to-r from-gray-900 via-gray-900 to-maroon text-white rounded-3xl text-center space-y-3 shadow-xl">
        <h3 className="text-xl font-black">Need assistance or technical support?</h3>
        <p className="text-xs text-gray-300 max-w-md mx-auto">
          Units can contact administrators directly through the floating chat widget on their Unit Dashboard.
        </p>
        <div className="pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-gray-950 font-bold rounded-xl text-xs hover:bg-gray-100 transition shadow"
          >
            Go to Portal Login
          </Link>
        </div>
      </div>
    </div>
  );
}
