Feature: Melakukan Login
In order to mengakses fitur masyarakat yang membutuhkan akun
As a masyarakat
I want to melakukan login

Background:
Given the authentication service is simulated

Scenario: Login berhasil
Given I am on the "/sign-in/sign-in-masyarakat" page
And I select "MASYARAKAT"
When I fill in "EMAIL" with "rahmadevi@gmail.com"
And I fill in "PASSWORD" with "password123"
And I press "AUTHENTICATE"
Then I should be redirected to the "/form-gamblin-analysis" page

Scenario: Login gagal karena field kosong
Given I am on the "/sign-in/sign-in-masyarakat" page
And I select "MASYARAKAT"
When I leave "EMAIL" empty
And I leave "PASSWORD" empty
And I press "AUTHENTICATE"
Then the browser should show a validation message on "EMAIL"
And I should remain on the "/sign-in/sign-in-masyarakat" page
And no account data should be sent to the authentication service

Scenario: Login gagal karena email tidak terdaftar
Given I am on the "/sign-in/sign-in-masyarakat" page
And I select "MASYARAKAT"
When I fill in "EMAIL" with "unknownuser@gmail.com"
And I fill in "PASSWORD" with "password123"
And I press "AUTHENTICATE"
Then I should see the message "Email atau password salah."
And I should remain on the "/sign-in/sign-in-masyarakat" page

Scenario: Login gagal karena password salah
Given I am on the "/sign-in/sign-in-masyarakat" page
And I select "MASYARAKAT"
When I fill in "EMAIL" with "rahmadevi@gmail.com"
And I fill in "PASSWORD" with "wrongpassword123"
And I press "AUTHENTICATE"
Then I should see the message "Email atau password salah."
And I should remain on the "/sign-in/sign-in-masyarakat" page

Scenario: Akun admin tidak bisa login lewat halaman masyarakat
Given I am on the "/sign-in/sign-in-masyarakat" page
And I select "MASYARAKAT"
When I fill in "EMAIL" with "admin@komdigi.go.id"
And I fill in "PASSWORD" with "password123"
And I press "AUTHENTICATE"
Then I should see the message "Akun administrator harus masuk melalui halaman Sign In Admin."
And I should remain on the "/sign-in/sign-in-masyarakat" page
