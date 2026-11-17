Mengakses Landing Page
		Feature: Mengakses Landing Page
In order to mendapatkan informasi awal mengenai sistem
As a masyarakat
I want to mengakses landing page

Scenario: Berhasil mengakses landing page
Given I am on the website
When I access the website
Then I should see the "/landing-page" page
And I should see the "Systematic Intelligent Online Gambling Detection and Reporting" section
And I should see the "SIGN UP" button
And I should see the "SIGN IN" button
And I should see the "FITUR UTAMA" section

Scenario: Mengakses halaman Sign Up dari landing page
Given I am on the "/landing-page" page
When I press "SIGN UP"
Then I should be redirected to the "/sign-up" page

Scenario: Mengakses halaman Sign In dari landing page
Given I am on the "/landing-page" page
When I press "SIGN IN"
Then I should be redirected to the "/sign-in" page

Scenario: Mengakses halaman Gambling Analysis dari landing page
Given I am on the "/landing-page" page
When I press "GAMBLING ANALYSIS"
Then I should be redirected to the "/gambling-analysis" page

Scenario: Mengakses halaman Feedback dari landing page
Given I am on the "/landing-page" page
When I press "FEEDBACK"
Then I should be redirected to the "/feedback" page
