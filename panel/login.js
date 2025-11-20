// Login sistemine rol kontrolü ekle
class LoginSystem {
    async login(email, password) {
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) throw authError;

            if (authData.user) {
                // Kullanıcı profilini getir
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single();

                if (profileError) throw profileError;

                // Rol kontrolü ve yönlendirme
                await this.handleRoleBasedRedirect(profile);

                // Son giriş zamanını güncelle
                await supabase
                    .from('profiles')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', authData.user.id);
            }

        } catch (error) {
            console.error('Giriş hatası:', error);
            throw error;
        }
    }

    async handleRoleBasedRedirect(profile) {
        // Hesap aktif değilse
        if (!profile.is_active) {
            throw new Error('Hesabınız admin onayı bekliyor veya pasif durumda.');
        }

        // Rol bazlı yönlendirme
        switch (profile.role) {
            case 'admin':
                window.location.href = 'admin-panel.html';
                break;
            case 'seller':
                // Satıcı onaylı mı kontrol et
                const { data: seller } = await supabase
                    .from('seller_profiles')
                    .select('status')
                    .eq('id', profile.seller_id)
                    .single();

                if (seller && seller.status) {
                    window.location.href = 'seller-panel.html';
                } else {
                    throw new Error('Satıcı hesabınız admin onayı bekliyor.');
                }
                break;
            case 'courier':
                // Kurye aktif mi kontrol et
                const { data: courier } = await supabase
                    .from('couriers')
                    .select('status')
                    .eq('id', profile.courier_id)
                    .single();

                if (courier && courier.status === 'active') {
                    window.location.href = 'courier-panel.html';
                } else {
                    throw new Error('Kurye hesabınız admin onayı bekliyor.');
                }
                break;
            case 'customer':
            default:
                window.location.href = 'index.html';
                break;
        }
    }
}