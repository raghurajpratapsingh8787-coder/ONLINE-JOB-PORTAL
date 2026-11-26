import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { LoadingRows } from '../../components/common/UI';

export function CandidateProfilePage() {
  const { user, refreshUser, toast } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<any>({
    queryKey: ['candidate-profile'],
    queryFn: () => apiRequest('/api/candidate/profile'),
  });

  const [name, setName] = useState(user?.name || '');
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  const [expectedSalaryMin, setExpectedSalaryMin] = useState<string>('');
  const [expectedSalaryMax, setExpectedSalaryMax] = useState<string>('');
  const [openToRemote, setOpenToRemote] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [education, setEducation] = useState<any[]>([]);
  const [experience, setExperience] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [portfolioLinks, setPortfolioLinks] = useState({
    website: '',
    github: '',
    linkedin: '',
    dribbble: '',
  });

  useEffect(() => {
    if (data?.profile) {
      const p = data.profile;
      setName(user?.name || '');
      setHeadline(p.headline || '');
      setSummary(p.summary || '');
      setPhone(p.phone || '');
      setLocation(p.location || '');
      setYearsOfExperience(p.yearsOfExperience || 0);
      setExpectedSalaryMin(p.expectedSalaryMin ? String(p.expectedSalaryMin) : '');
      setExpectedSalaryMax(p.expectedSalaryMax ? String(p.expectedSalaryMax) : '');
      setOpenToRemote(Boolean(p.openToRemote));
      setSkills(p.skills || []);
      setEducation(p.education || []);
      setExperience(p.experience || []);
      setCertifications(p.certifications || []);
      setProjects(p.projects || []);
      setPortfolioLinks({
        website: p.portfolioLinks?.website || '',
        github: p.portfolioLinks?.github || '',
        linkedin: p.portfolioLinks?.linkedin || '',
        dribbble: p.portfolioLinks?.dribbble || '',
      });
    }
  }, [data, user?.name]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/candidate/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          headline,
          summary,
          phone,
          location,
          yearsOfExperience: Number(yearsOfExperience) || 0,
          expectedSalaryMin: expectedSalaryMin ? Number(expectedSalaryMin) : undefined,
          expectedSalaryMax: expectedSalaryMax ? Number(expectedSalaryMax) : undefined,
          openToRemote,
          skills,
          education,
          experience,
          certifications,
          projects,
          portfolioLinks,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-profile'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-dashboard'] });
      void refreshUser();
      toast({ title: 'Profile saved', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Could not save profile', description: err.message, variant: 'error' });
    },
  });

  if (isLoading) return <LoadingRows count={4} />;

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            My Professional Profile
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Profile completeness: <span className="font-mono font-semibold text-blue-700 tabular-nums">{data?.completion?.percentage ?? 0}%</span>
          </p>
        </div>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg self-start disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saveMutation.isPending ? 'Saving…' : 'Save Profile'}</span>
        </button>
      </div>

      {/* Core Information */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">Personal &amp; Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              id="prof-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="prof-headline" className="block text-xs font-semibold text-slate-700 mb-1">Professional Headline</label>
            <input
              id="prof-headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Full-Stack Engineer · TypeScript & React"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="prof-loc" className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
            <input
              id="prof-loc"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="prof-phone" className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
            <input
              id="prof-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="prof-yoe" className="block text-xs font-semibold text-slate-700 mb-1">Years of Experience</label>
            <input
              id="prof-yoe"
              type="number"
              min={0}
              max={60}
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="prof-sal-min" className="block text-xs font-semibold text-slate-700 mb-1">Expected Min ($)</label>
              <input
                id="prof-sal-min"
                type="number"
                value={expectedSalaryMin}
                onChange={(e) => setExpectedSalaryMin(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="prof-sal-max" className="block text-xs font-semibold text-slate-700 mb-1">Expected Max ($)</label>
              <input
                id="prof-sal-max"
                type="number"
                value={expectedSalaryMax}
                onChange={(e) => setExpectedSalaryMax(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="prof-summary" className="block text-xs font-semibold text-slate-700 mb-1">Bio / Summary</label>
          <textarea
            id="prof-summary"
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={openToRemote}
            onChange={(e) => setOpenToRemote(e.target.checked)}
          />
          <span>Open to remote opportunities</span>
        </label>
      </section>

      {/* Skills */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">Skills</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="Add a skill (e.g. TypeScript, PyTorch, Kubernetes)…"
            className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <button
            type="button"
            onClick={addSkill}
            className="px-4 py-2 text-sm font-semibold text-white bg-navy-900 rounded-lg"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => setSkills(skills.filter((s) => s !== skill))}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
              title="Click to remove skill"
            >
              <span>{skill}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      </section>

      {/* Work Experience */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-slate-900">Work Experience</h2>
          <button
            type="button"
            onClick={() =>
              setExperience([
                ...experience,
                {
                  id: `exp-${Date.now()}`,
                  company: '',
                  title: '',
                  location: '',
                  startDate: '',
                  endDate: '',
                  current: false,
                  description: '',
                },
              ])
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Role</span>
          </button>
        </div>

        <div className="space-y-4">
          {experience.map((item, idx) => (
            <div key={item.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={item.title}
                  onChange={(e) => {
                    const next = [...experience];
                    next[idx] = { ...item, title: e.target.value };
                    setExperience(next);
                  }}
                  placeholder="Job Title"
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={item.company}
                  onChange={(e) => {
                    const next = [...experience];
                    next[idx] = { ...item, company: e.target.value };
                    setExperience(next);
                  }}
                  placeholder="Company"
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={item.location}
                  onChange={(e) => {
                    const next = [...experience];
                    next[idx] = { ...item, location: e.target.value };
                    setExperience(next);
                  }}
                  placeholder="Location"
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <input
                  type="text"
                  value={item.startDate}
                  onChange={(e) => {
                    const next = [...experience];
                    next[idx] = { ...item, startDate: e.target.value };
                    setExperience(next);
                  }}
                  placeholder="Start (e.g. 2022-01)"
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={item.endDate}
                  onChange={(e) => {
                    const next = [...experience];
                    next[idx] = { ...item, endDate: e.target.value };
                    setExperience(next);
                  }}
                  placeholder="End (or Present)"
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setExperience(experience.filter((_, i) => i !== idx))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline justify-self-start sm:justify-self-end"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={item.description}
                onChange={(e) => {
                  const next = [...experience];
                  next[idx] = { ...item, description: e.target.value };
                  setExperience(next);
                }}
                placeholder="Key deliverables and measurable outcomes…"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-slate-900">Education</h2>
          <button
            type="button"
            onClick={() =>
              setEducation([
                ...education,
                {
                  id: `edu-${Date.now()}`,
                  institution: '',
                  degree: '',
                  fieldOfStudy: '',
                  startYear: '',
                  endYear: '',
                  grade: '',
                },
              ])
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Education</span>
          </button>
        </div>

        <div className="space-y-3">
          {education.map((edu, idx) => (
            <div key={edu.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={edu.institution}
                onChange={(e) => {
                  const next = [...education];
                  next[idx] = { ...edu, institution: e.target.value };
                  setEducation(next);
                }}
                placeholder="University / Institution"
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={edu.degree}
                onChange={(e) => {
                  const next = [...education];
                  next[idx] = { ...edu, degree: e.target.value };
                  setEducation(next);
                }}
                placeholder="Degree (e.g. B.S., M.Tech)"
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={edu.fieldOfStudy}
                onChange={(e) => {
                  const next = [...education];
                  next[idx] = { ...edu, fieldOfStudy: e.target.value };
                  setEducation(next);
                }}
                placeholder="Field of Study"
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={edu.startYear}
                onChange={(e) => {
                  const next = [...education];
                  next[idx] = { ...edu, startYear: e.target.value };
                  setEducation(next);
                }}
                placeholder="Start Year"
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={edu.endYear}
                onChange={(e) => {
                  const next = [...education];
                  next[idx] = { ...edu, endYear: e.target.value };
                  setEducation(next);
                }}
                placeholder="End Year"
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={edu.grade || ''}
                  onChange={(e) => {
                    const next = [...education];
                    next[idx] = { ...edu, grade: e.target.value };
                    setEducation(next);
                  }}
                  placeholder="GPA / Grade"
                  className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Remove education entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Projects & Certifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">Projects</h2>
            <button
              type="button"
              onClick={() =>
                setProjects([
                  ...projects,
                  { id: `proj-${Date.now()}`, title: '', description: '', techStack: [], url: '' },
                ])
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
            >
              <Plus className="w-4 h-4" />
              <span>Add Project</span>
            </button>
          </div>
          {projects.map((p, idx) => (
            <div key={p.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={p.title}
                  onChange={(e) => {
                    const next = [...projects];
                    next[idx] = { ...p, title: e.target.value };
                    setProjects(next);
                  }}
                  placeholder="Project Title"
                  className="flex-1 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setProjects(projects.filter((_, i) => i !== idx))}
                  className="text-red-600 p-1.5"
                  aria-label="Remove project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                type="url"
                value={p.url || ''}
                onChange={(e) => {
                  const next = [...projects];
                  next[idx] = { ...p, url: e.target.value };
                  setProjects(next);
                }}
                placeholder="https://github.com/..."
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <textarea
                rows={2}
                value={p.description}
                onChange={(e) => {
                  const next = [...projects];
                  next[idx] = { ...p, description: e.target.value };
                  setProjects(next);
                }}
                placeholder="Brief summary of architecture and impact"
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
          ))}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">Certifications</h2>
            <button
              type="button"
              onClick={() =>
                setCertifications([
                  ...certifications,
                  { id: `cert-${Date.now()}`, name: '', issuer: '', issueDate: '', credentialUrl: '' },
                ])
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
            >
              <Plus className="w-4 h-4" />
              <span>Add Certification</span>
            </button>
          </div>
          {certifications.map((c, idx) => (
            <div key={c.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={c.name}
                  onChange={(e) => {
                    const next = [...certifications];
                    next[idx] = { ...c, name: e.target.value };
                    setCertifications(next);
                  }}
                  placeholder="Certification Name"
                  className="flex-1 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}
                  className="text-red-600 p-1.5"
                  aria-label="Remove certification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={c.issuer}
                  onChange={(e) => {
                    const next = [...certifications];
                    next[idx] = { ...c, issuer: e.target.value };
                    setCertifications(next);
                  }}
                  placeholder="Issuer"
                  className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={c.issueDate}
                  onChange={(e) => {
                    const next = [...certifications];
                    next[idx] = { ...c, issueDate: e.target.value };
                    setCertifications(next);
                  }}
                  placeholder="Date (e.g. 2025-04)"
                  className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Portfolio Links */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">Portfolio &amp; Social Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['github', 'linkedin', 'website', 'dribbble'] as const).map((field) => (
            <div key={field}>
              <label htmlFor={`link-${field}`} className="block text-xs font-semibold text-slate-700 mb-1 capitalize">
                {field} URL
              </label>
              <input
                id={`link-${field}`}
                type="url"
                value={portfolioLinks[field]}
                onChange={(e) => setPortfolioLinks({ ...portfolioLinks, [field]: e.target.value })}
                placeholder={`https://${field}.com/...`}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}
