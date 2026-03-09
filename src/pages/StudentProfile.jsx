import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function StudentProfile() {
    const navigate = useNavigate();

    // Sample student data - in a real app, this would come from a backend
    const [student, setStudent] = useState({
        firstName: 'Ola',
        lastName: 'Nordmann',
        email: 'ola.nordmann@email.com',
        phone: '+47 123 45 678',
        bio: 'Fullstudent ved NTNU som søker praktisk erfaring innen teknologi.',
        school: 'NTNU',
        field: 'Datateknologi',
        graduationYear: 2025,
    });

    const [appliedInternships] = useState([
        { id: 1, company: 'Teknologi AS', position: 'Frontend Internship', status: 'pending', appliedDate: '2024-01-15' },
        { id: 2, company: 'Innovasjon Norge', position: 'Web Developer', status: 'accepted', appliedDate: '2024-01-10' },
    ]);

    const [savedInternships] = useState([
        { id: 3, company: 'Data Systems', position: 'Backend Developer' },
        { id: 4, company: 'Cloud Solutions', position: 'Full Stack Developer' },
    ]);

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(student);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveChanges = () => {
        setStudent(editData);
        setIsEditing(false);
        alert('Profilen din har blitt oppdatert!');
    };

    const handleCancel = () => {
        setEditData(student);
        setIsEditing(false);
    };

    const getStatusBadge = (status) => {
        const statusClasses = {
            pending: 'badge-pending',
            accepted: 'badge-accepted',
            rejected: 'badge-rejected',
        };
        const statusText = {
            pending: 'Venter',
            accepted: 'Godtatt',
            rejected: 'Avslått',
        };
        return <span className={`status-badge ${statusClasses[status]}`}>{statusText[status]}</span>;
    };

    return (
        <main className="student-profile">
            <div className="container">
                {/* Profile Header */}
                <section className="profile-header">
                    <div className="profile-avatar">
                        <div className="avatar-placeholder">{student.firstName.charAt(0)}{student.lastName.charAt(0)}</div>
                    </div>
                    <div className="profile-info">
                        {!isEditing ? (
                            <>
                                <h1>{student.firstName} {student.lastName}</h1>
                                <p className="bio">{student.bio}</p>
                                <div className="profile-details">
                                    <span>📧 {student.email}</span>
                                    <span>📱 {student.phone}</span>
                                    <span>🎓 {student.school} - {student.field}</span>
                                </div>
                                <button className="btn btn-secondary" onClick={() => { setEditData(student); setIsEditing(true); }}>
                                    Rediger profil
                                </button>
                            </>
                        ) : (
                            <div className="edit-form">
                                <div className="form-group">
                                    <label>Fornavn</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={editData.firstName}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Etternavn</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={editData.lastName}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>E-post</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={editData.email}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Telefon</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={editData.phone}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Biografi</label>
                                    <textarea
                                        name="bio"
                                        value={editData.bio}
                                        onChange={handleInputChange}
                                        rows="4"
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Skole</label>
                                    <input
                                        type="text"
                                        name="school"
                                        value={editData.school}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fagfelt</label>
                                    <input
                                        type="text"
                                        name="field"
                                        value={editData.field}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-actions">
                                    <button className="btn btn-primary" onClick={handleSaveChanges}>Lagre endringer</button>
                                    <button className="btn btn-secondary" onClick={handleCancel}>Avbryt</button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Applications */}
                <section className="profile-section">
                    <h2>Mine søknader</h2>
                    {appliedInternships.length > 0 ? (
                        <div className="applications-list">
                            {appliedInternships.map(app => (
                                <div key={app.id} className="application-card">
                                    <div className="app-info">
                                        <h3>{app.company}</h3>
                                        <p>{app.position}</p>
                                        <small>Søkt {app.appliedDate}</small>
                                    </div>
                                    <div className="app-status">
                                        {getStatusBadge(app.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-state">Du har ikke søkt på noen praksisplasser ennå.</p>
                    )}
                </section>

                {/* Saved Internships */}
                <section className="profile-section">
                    <h2>Lagrede praksisplasser</h2>
                    {savedInternships.length > 0 ? (
                        <div className="saved-list">
                            {savedInternships.map(internship => (
                                <div key={internship.id} className="saved-card">
                                    <div className="saved-info">
                                        <h3>{internship.company}</h3>
                                        <p>{internship.position}</p>
                                    </div>
                                    <button className="btn btn-primary btn-small">Søk nå</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-state">Du har ikke lagret noen praksisplasser ennå.</p>
                    )}
                </section>

                {/* Quick Actions */}
                <section className="profile-section">
                    <h2>Hurtiglenker</h2>
                    <div className="quick-actions">
                        <button className="action-btn" onClick={() => navigate('/internships')}>
                            <span className="action-icon">🔍</span>
                            <span>Se alle praksisplasser</span>
                        </button>
                        <button className="action-btn" onClick={() => navigate('/apply')}>
                            <span className="action-icon">📝</span>
                            <span>Søk på praksis</span>
                        </button>
                        <button className="action-btn">
                            <span className="action-icon">📥</span>
                            <span>Last ned CV</span>
                        </button>
                        <button className="action-btn">
                            <span className="action-icon">⚙️</span>
                            <span>Innstillinger</span>
                        </button>
                    </div>
                </section>
            </div>

            <Footer />
        </main>
    );
}
